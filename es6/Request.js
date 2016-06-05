import o2x         from "object-to-xml"
import Promise     from "bluebird"
import req         from "request-promise"
import debug       from "debug"
import limit       from "simple-rate-limiter"

import {throws}    from "./errors"
import Parser      from "./Parser"
import range       from "./utils/range"
import Immutable  from "./utils/Immutable"

// Definitions
import Fields      from "./definitions/fields"
import Endpoints   from "./definitions/endpoints"
import Verbs       from "./definitions/verbs"
import Globals     from "./definitions/globals"

const SANDBOX = "sandbox"
const second  = 1000
const minute  = 60 * second
const hour    = 60 * minute
const day     = 24 * hour
const PROD    = "production"
const HEADING = 'xml version="1.0" encoding="utf-8"?'
const LIST    = "List"
const log     = debug("Ebay:Request")
/**
 * Immmutable request object for making eBay API verbs
 */
export default class Request {

  /**
   * pure creation interface
   *
   * @param      {Object}   state   The state
   * @return     {Request}  the new Request object
   */
  static create (state) {
    return new Request(state)
  }

  /**
   * creates the new Request object
   *
   * @param      {Object}  previous  The previous state
   */
  constructor ( previous = {} ) {
    /**
     * internal immutable state
     */
    this.state          = Immutable.copy(previous)
    /**
     * ensures fields are detectable
     */
    this.state.fields   = this.state.fields  || {}
    /**
     * ensures globals are detectable
     */
    this.state.globals  = this.state.globals || {}

    /**
     * generates the headers for a request
     */
    this.headers = {
        "X-EBAY-API-CALL-NAME"           : this.verb
      , "X-EBAY-API-COMPATIBILITY-LEVEL" : "775"
      , "X-EBAY-API-CERT-NAME"           : this.globals.cert
      , "X-EBAY-API-SITEID"              : this.globals.site || 0
      , "X-EBAY-API-APP-NAME"            : this.globals.app  || "node.js::ebay-promised"
    }
    Object.freeze(this.state)
    Object.freeze(this.headers)

  }

  /**
   * returns the URL of the Request
   *
   * @return     {String}  the url
   */
  get endpoint () {
    const endpoint = Endpoints[this.globals.serviceName][ this.globals.sandbox ? SANDBOX : PROD ]
    
    return endpoint
      ? endpoint
      : throws.Invalid_Endpoint(this)
  }

  /**
   * returns a copy of the internal globals
   *
   * @return     {Object}  the globals
   */
  get globals () {
    return Immutable.copy(this.state.globals)
  }

  /**
   * returns an array of all the field names that have been added to the Request
   *
   * @return     {Array<String>}  the array of names
   */
  get fieldKeys () {
    return Object.keys(this.fields)
  }

  /**
   * returns key,value pair representation of the 
   *
   * @return     {Array<String,Any>} the pairs  
   */
  get fieldPairs () {
    const fields = this.fields
    return this.fieldKeys.map( field => [ field, fields[field] ] )
  }

  /**
   * returns a copy of the Request's fields
   *
   * @return     {Object}  the fields
   */
  get fields () {
    return Immutable.copy(this.state.fields)
  }

  /**
   * returns the expected name of XML node of a Request
   *
   * @return     {String}  { description_of_the_return_value }
   */
  get responseWrapper () {
    return `${this.verb}Response`
  }

  /**
   * { function_description }
   *
   * @return     {<type>}  { description_of_the_return_value }
   */
  get verb () {
    return this.state.verb
  }

  get token () {
    return this.globals.authToken
  }

  get credentials () {
    return { RequesterCredentials: { eBayAuthToken: this.token } }
  }

  get xmlns () {
    return `${this.verb}Request xmlns="urn:ebay:apis:eBLBaseComponents"`
  }

  xml (options = {}) {

    const payload  = this.fields
    const listKey  = this.listKey()
    
    if (listKey !== false) {
      payload[ listKey ] = Immutable.merge( 
          payload[listKey]
        , this.pagination(options.page) 
      )
    }

    return o2x({
        [HEADING]    : null
      , [this.xmlns] : Immutable.merge(this.credentials, payload)
    })
  }

  listKey () {
    const fields = this.fieldKeys
    while (fields.length) {
      const field = fields.pop()
      if ( ~field.indexOf(LIST) ) return field
    }
    return false
  }

  pagination (page=1) {
    return {  
      Pagination: {
          PageNumber     : page
        , EntriesPerPage : this.globals.perPage
      }
    }
  }

  invoke () {
    // TODO: add deprecation message
    return this.run()
  }

  fetch (options) {
    return new Promise( (resolve, reject)=> {
      Request.post({
          url       : this.endpoint
        , headers   : this.headers
        , body      : this.xml(options)
      }).once("limiter-exec",  promise => {
        promise
          .then(Parser.toJSON)
          .then( json => Parser.unwrap(this, json) )
          .then(Parser.clean)
          .then(resolve)
          .catch(reject)
      })
    })
  }

  run (options = {}) {
    if ( !this.globals.authToken ) throws.No_Auth_Token_Error()
    if ( !this.verb )              throws.No_Call_Error()

    return this.fetch(options)
      .bind(this)
      .then(this.schedule)
  }

  schedule (res) {
    // we aren't handling pagination
    if (!res.pagination || res.pagination.pages < 2) return res

    return Promise.mapSeries(
        range(2, res.pagination.pages)
      , page => this.fetch({ page: page })
    ).then( results => {
      return results.reduce( (all, result) => {
        all.results.concat( result.results )
        return all
      }, { results: [] })
    })
  }
}

/**
 * 
 * Ebay ratelimits to 5000 verbs per day per default
 * 
 * source: https://go.developer.ebay.com/api-verb-limits
 * 
 * this can be reconfigured on load if you are using 
 * an approved compatible Application
 * 
 * @example
 *   Request.post.to(1.5million).per(DAY)
 * 
 */

Request.RATELIMIT = {
  factor : ( 5000 / day ) * second // req/sec
}

Request.post = limit( function EbayRequestSingleton () { return req.post(...arguments) })
  .to( Math.floor(Request.RATELIMIT.factor * minute) )
  .per( minute )

Verbs.forEach( verb => {
  // cache
  const $verb = {verb: verb}
  
  Request.prototype[verb] = function requestCallSetter () {
    const cloned = Immutable.merge(this.state, $verb)
    return Request.create(cloned)
  }
})

Fields.forEach( field => {
  Request.prototype[field] = function requestFieldSetter (val) {
    const cloned = Immutable.copy(this.state)
    cloned.fields[field] = val
    return Request.create(cloned)
  }
})

Object.keys(Endpoints).concat(Globals).forEach( global => {
  Request.prototype[global] = function requestGlobalSetter (val) {
    throws.Setting_Error(global)
  }
})
