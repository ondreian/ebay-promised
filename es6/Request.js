import o2x         from "object-to-xml"
import Promise     from "bluebird"
import req         from "request-promise"
import debug       from "debug"
import limit       from "simple-rate-limiter"

import {throws}    from "./errors"
import Parser      from "./Parser"
import range       from "./utils/range"
import Immutable   from "./utils/Immutable"

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
const LISTING = "Listing"
const log     = debug("ebay:request")
/**
 * Immmutable request object for making eBay API verbs
 */
export default class Request {

  /**
   * pure creation interface.  
   * Generally not needed as the Ebay module delegates transparently to a Request instance
   *
   * @param      {Object}   state   The state
   * @return     {Request}  the new Request object
   * @example
   * 
   *   Ebay
   *    .create(config)
   *    .GetMyeBaySelling()
   *    .run()
   *    .then(handleSuccess)
   *    .catch(errors.Ebay_Api_Error, handleValidationError)
   *    .catch(handleAllOtherErrors)
   */
  static create (state) {
    return new Request(state)
  }

  /**
   * creates the new Request object
   *
   * @private
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
   * @private
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
   * @private
   * @return     {Object}  the globals
   */
  get globals () {
    return Immutable.copy(this.state.globals)
  }

  /**
   * returns an array of all the field names that have been added to the Request
   *
   * @private
   * @return     {Array<String>}  the array of names
   */
  get fieldKeys () {
    return Object.keys(this.fields)
  }

  /**
   * returns a copy of the Request's fields
   *
   * @private
   * @return     {Object}  the fields
   */
  get fields () {
    return Immutable.copy(this.state.fields)
  }

  /**
   * returns the expected name of XML node of a Request
   *
   * @private
   * @return     {String}  { description_of_the_return_value }
   */
  get responseWrapper () {
    return `${this.verb}Response`
  }

  /**
   * returns the verb to use for this request
   *
   * @private
   * @return     {String}  the verb
   */
  get verb () {
    return this.state.verb
  }

  /**
   * returns the auth token for this request
   * 
   * @private
   * @return     {String}  eBay Auth token
   */
  get token () {
    return this.globals.authToken
  }

  /**
   * returns the XML structure for the SOAP auth
   * 
   * @private
   * @return     {Object}  the SOAP
   */
  get credentials () {
    return { RequesterCredentials: { eBayAuthToken: this.token } }
  }

  /**
   * returns the XML namespace
   * 
   * @private
   * @return     {String}  the XML namespace from the verb
   */
  get xmlns () {
    return `${this.verb}Request xmlns="urn:ebay:apis:eBLBaseComponents"`
  }

  /**
   * returns the XML document for the request
   * 
   * @private
   * @param      {Object}  options  The options
   * @return     {String}           The XML string of the Request
   */
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

  /**
   * convenience method for `tapping` the Request
   *
   * @param      {Function}  fn      The function to run
   */
  tap (fn) {
    fn.call(this, this)
    return this
  }

  /**
   * determines if the Request uses a List and which key it is
   *
   * @private
   * @return     {string|false}   the key that is a List  
   */
  listKey () {
    const fields = this.fieldKeys
    while (fields.length) {
      const field = fields.pop()
      if (~field.indexOf(LISTING)) continue
      if (~field.indexOf(LIST)) return field
    }
    return false
  }

  /**
   * generates a pagination Object
   *
   * @param      {number}  page    The page to fetch
   * @return     {Object}          The pagination representation
   */
  pagination (page=1) {
    return {  
      Pagination: {
          PageNumber     : page
        , EntriesPerPage : this.globals.perPage
      }
    }
  }

  /**
   * alias for `run()`
   *
   * @deprecated
   * @return     {Promise<Object>}   resolves to the response 
   */
  invoke () {
    console.warn("deprecation warning :: the .invoke() method has been migrated to .run() and will be removed in the next major release")
    return this.run()
  }

  /**
   * runs the HTTP Post to eBay
   *
   * @private
   * @param      {Object}   options  The options
   * @return     {Promise}           resolves to the response
   *
   */
  fetch (options) {
    return new Promise( (resolve, reject)=> {
      Request.post({
          url       : this.endpoint
        , headers   : this.headers
        , body      : this.xml(options)
        // Hotfix for OpenSSL issue
        // https://github.com/openssl/openssl/pull/852
        // https://github.com/nodejs/node/issues/3692
        , agentOptions: { 
              ciphers        : 'ALL'
            , secureProtocol : 'TLSv1_method'
          }
      }).once("limiter-exec",  req => {
        req = Promise
          .resolve(req)
          .tap(log)

        // resolve to raw XML
        if (this.globals.raw) {
          return req.then(resolve).catch(reject)
        }

        return req
          .then(Parser.toJSON)
          .then( json => Parser.unwrap(this, json) )
          .then(Parser.clean)
          .then(resolve)
          .catch(reject)
      })
    })
  }

  /**
   * runs the current Request 
   *
   * @param      {<type>}  options  The options
   * @return     {<type>}  { description_of_the_return_value }
   */
  run (options = {}) {
    if ( !this.globals.authToken ) throws.No_Auth_Token_Error()
    if ( !this.verb )              throws.No_Call_Error()

    return this
      .fetch(options)
      .bind(this)
      .then(this.schedule)
  }

  /**
   * schedules pagination requests
   * 
   * @private
   * @param      {Object}   first   The first response from the API
   * @return     {Promise}          resolves to the first resposne or the concatenated Responses
   */
  schedule (first) {
    // we aren't handling pagination
    if (!first.pagination || first.pagination.pages < 2) return first

    log(`beginning pagination for [2..${first.pagination.pages}]`)
    
    return Promise.mapSeries(
        range(2, first.pagination.pages)
      , page => this.fetch({ page: page })
    ).then( results => {
      return results.reduce( (all, result) => {
        all.results = all.results.concat( result.results )
        return all
      }, first)
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
