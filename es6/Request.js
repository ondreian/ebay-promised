import o2x         from "object-to-xml"
import Promise     from "bluebird"
import {post}      from "request-promise"
import * as errors from "./errors"
import Creatable   from "./utils/Creatable"
import Fields      from "./definitions/fields"
import Endpoints   from "./definitions/endpoints"
import Calls       from "./definitions/calls"
import Globals     from "./definitions/globals"

const SANDBOX = "sandbox"
const PROD    = "production"
const HEADING = 'xml version="1.0" encoding="utf-8"?'
const LIST    = "List"

export default class Request extends Creatable {
  constructor ( previous = {} ) {
    super()
    this.state          = Object.assign({}, previous)
    this.state.fields   = this.state.fields  || {}
    this.state.globals  = this.state.globals || {}

    this.headers = {
        "X-EBAY-API-CALL-NAME"           : this.call
      , "X-EBAY-API-COMPATIBILITY-LEVEL" : "775"
      , "X-EBAY-API-CERT-NAME"           : this.globals.cert
      , "X-EBAY-API-SITEID"              : this.globals.site || 0
      , "X-EBAY-API-APP-NAME"            : this.globals.app  || "node.js::ebay-promised"
    }
  }

  get endpoint () {
    const endpoint = Endpoints[this.globals.serviceName][ this.state.sandbox ? SANDBOX : PROD ]
    
    return endpoint
      ? endpoint
      : errors.throw.Invalid_Endpoint(this)
  }

  get globals () {
    return this.state.globals
  }

  get fields () {
    const fields = this.state.fields
    return Object.keys(fields).map( field => [ field, fields[field] ] )
  }

  get call () {
    return this.state.call
  }

  get credentials () {
    return {
      RequesterCredentials: { eBayAuthToken: this.globals.authToken }
    }
  }

  get xmlNamespace () {
    return `${this.call}Request xmlns="urn:ebay:apis:eBLBaseComponents"`
  }

  get xml () {
    return o2x({
        [HEADING]           : null
      , [this.xmlNamespace] : [ this.credentials, this.payload() ]
    })
  }

  payload () {
    const fields  = Object.assign({}, this.state.fields)
    const const [listKey, val] = this.listKey()
    if (listKey) fields[ listNode ] = Object.assign(val, this.pagination())
    return fields
  }

  listKey () {
    return this.fields.filter( ([field, val]) => ~field.indexOf(LIST) )[0] || [null, null]
  }

  pagination (page=1) {
    return {  
      Pagination: {
          PageNumber     : page
        , EntriesPerPage : this.globals.perPage
      }
    }
  }
}

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
    throw new Error(`You cannot call ${omni} on an Ebay.Request instance as it is a global setting`)
  }
})
