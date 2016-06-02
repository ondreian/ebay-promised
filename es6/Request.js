import o2x         from "object-to-xml"
import Promise     from "bluebird"
import req         from "request-promise"
import Lazy        from "lazy.js"
import debug       from "debug"
import limit       from "simple-rate-limiter"

import {throws}    from "./errors"
import Parser      from "./Parser"

// Definitions
import Fields      from "./definitions/fields"
import Endpoints   from "./definitions/endpoints"
import Calls       from "./definitions/calls"
import Globals     from "./definitions/globals"

const SANDBOX = "sandbox"
const PROD    = "production"
const HEADING = 'xml version="1.0" encoding="utf-8"?'
const LIST    = "List"
const log     = debug("Ebay:Request")
/**
 * Immmutable request object for making eBay API calls
 */
export default class Request {

  static create () {
    return new this(...arguments)
  }

  constructor ( previous = {} ) {
    /**
     * internal immutable state
     */
    this.state          = Object.assign({}, previous)
    /**
     * { item_description }
     */
    this.state.fields   = this.state.fields  || {}
    this.state.globals  = this.state.globals || {}

    this.headers = {
        "X-EBAY-API-CALL-NAME"           : this.call
      , "X-EBAY-API-COMPATIBILITY-LEVEL" : "775"
      , "X-EBAY-API-CERT-NAME"           : this.globals.cert
      , "X-EBAY-API-SITEID"              : this.globals.site || 0
      , "X-EBAY-API-APP-NAME"            : this.globals.app  || "node.js::ebay-promised"
    }

    Object.freeze(this.state)
    Object.freeze(this.headers)

  }

  get endpoint () {
    const endpoint = Endpoints[this.globals.serviceName][ this.globals.sandbox ? SANDBOX : PROD ]
    
    return endpoint
      ? endpoint
      : throws.Invalid_Endpoint(this)
  }

  get globals () {
    return Object.assign({}, this.state.globals)
  }

  get fieldKeys () {
    return Object.keys(this.fields)
  }

  get fieldPairs () {
    const fields = this.fields
    return this.fieldKeys.map( field => [ field, fields[field] ] )
  }

  get fields () {
    return Object.assign({}, this.state.fields)
  }

  get call () {
    return this.state.call
  }

  get token () {
    return this.globals.authToken
  }

  get credentials () {
    return { RequesterCredentials: { eBayAuthToken: this.token } }
  }

  get xmlns () {
    return `${this.call}Request xmlns="urn:ebay:apis:eBLBaseComponents"`
  }

  get xml () {
    return o2x({
        [HEADING]    : null
      , [this.xmlns] : Object.assign(
            {}
          , this.credentials
          , this.payload()
        )
    })
  }

  payload () {
    const fields  = this.fields
    const listKey = this.listKey()
    if (listKey !== false) {
      fields[ listKey ] = Object.assign( fields[listKey], this.pagination() )
    }
    return fields
  }

  listKey () {
    const fields = this.fieldKeys
    while (fields.length) {
      const field = fields.pop()
      if ( Lazy(field).contains(LIST) ) return field
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

  run (options = {}) {
    if ( !this.globals.authToken ) throws.No_Auth_Token_Error()
    if ( !this.call )              throws.No_Call_Error()
    
    /*
     * use a singleton so even multiple instances of Ebay are rate limited 
     * then even multiple simultaneous requests go in the same queue
     */
    return new Promise( (resolve, reject)=> {
      Request
        .post({
            url     : this.endpoint
          , headers : this.headers
          , body    : this.xml
        })
        .once("limiter-exec", promise => {
          promise
            .then(Parser.toJSON)
            .then(Parser.unwrap(this.call))
            .then(Parser.clean)
            .then(resolve)
            .catch(reject)
        })
    })
  
  }
}

/**
 * 
 * Ebay ratelimits to 5000 calls per day per default
 * 
 * source: https://go.developer.ebay.com/api-call-limits
 * 
 * this can be reconfigured on load if you are using 
 * an approved compatible Application
 * 
 * @example
 *   Request.post.to(1.5million).per(DAY)
 * 
 */
Request.post = limit(function XMLPost () {
  return req.post(...arguments)
})
.to(5000)
.per( 1000 * 60 * 60 * 24 )

Calls.forEach( call => {
  Request.prototype[call] = function requestCallSetter () {
    return Request.create(Object.assign({}, this.state, {
      call: call
    }))
  }
})

Fields.forEach( field => {
  Request.prototype[field] = function requestFieldSetter (val) {
    const cloned = Object.assign({}, this.state)
    cloned.fields[field] = val
    return Request.create(cloned)
  }
})

Globals.forEach( omni => {
  Request.prototype[omni] = function requestGlobalSetter (val) {
    throws.Setting_Error(omni)
  }
})
