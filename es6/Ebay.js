// @flow
import Request   from "./Request"
import {throws}  from "./errors"
import Immutable from "./utils/Immutable"

// dynamic definitions aggregated from crawling Ebay"s API docs
import Endpoints from "./definitions/endpoints"
import Fields    from "./definitions/fields"
import Globals   from "./definitions/globals"
import Verbs     from "./definitions/verbs"

export default class Ebay {
  globals  : Object
  
  defaults : Object = {
      serviceName  : "Trading"
    , sandbox      : false
    , site         : 0
    , raw          : false      // return raw XML -> JSON response from Ebay
    , perPage      : 100
  }
  
  static Request : Request = Request
  
  /**
   * pure creation interface useful for iterations and other places where context may be lost
   *
   * @return     {Ebay}  a new Ebay instance
   */
  static create ( settings: Object = {}) : Ebay {
    return new Ebay( settings )
  }

  /**
   * Loads credentials from `process.env`
   * 
   * @return {Ebay}          a new Ebay instance
   * @throws {Env_Error}
   */
  static fromEnv () : Ebay {
    return Ebay.create({
        authToken : process.env.EBAY_TOKEN   || throws.Env_Error("EBAY_TOKEN")
      , cert      : process.env.EBAY_CERT    || throws.Env_Error("EBAY_CERT")
      , app       : process.env.EBAY_APP_ID  || throws.Env_Error("EBAY_APP_ID")
      , devName   : process.env.EBAY_DEV_ID  || throws.Env_Error("EBAY_DEV_ID")
      , sandbox   : process.env.EBAY_SANDBOX || false
    })
  }

  /**
   * creates the immutable Ebay instance that everything else resolves from
   *
   * @param      {Object}  settings the global settings
   * @return     {Ebay}
   */
  constructor ( settings: Object ) {
    /**
     * global settings for all following Ebay requests
     */
    this.globals: Object  = Immutable.merge(Ebay.defaults, settings)
    /**
     * insure an error is thrown if internals are changed
     * allows for better assertions about the statefulness 
     */
    Object.freeze(this.globals)
  }

  /**
   * Deprecated in favor of `Ebay.prototype.run`
   * adds to developer ergonomics by adding a sensible error
   * 
   * @deprecated
   * @throws     {Error}
   * @return      null
   */
  invoke () : void {
    console.warn("deprecation warning :: the .invoke() method has been migrated to .run() and will be removed in the next major release")
    return this.run()
  }

  /**
   * developer ergonomic error that ensures we have at least defined the verb we want to attempt
   * 
   * @throws {Error} 
   * @return null
   */
  run (): void {
    throws.Error("Cannot run an empty Request, please define an eBay verb or field")
  }
}


/**
 * reference to the {Request} class
 */
Ebay.Request = Request

Verbs.forEach( verb => {
  Ebay[verb] = function () {
    return Ebay.create()[verb]()
  }

  Ebay.prototype[verb] = function () {
    return Ebay.Request.create( this )[verb]()
  }
})

Object.keys(Endpoints).forEach( endpoint => {
  Ebay[endpoint] = function () {
    return Ebay.create()[endpoint]()
  }

  Ebay.prototype[endpoint] = function () {
   return Ebay.serviceName( endpoint )
  }

})

Fields.forEach( field => {
  Ebay[field] = function ( val ) {
    return Ebay.create()[field]( val )
  }

  Ebay.prototype[field] = function ( val ) {
    return Ebay.Request.create( this )[field]( val )
  }
})

Globals.forEach( global => {
  Ebay[global] = function ( val ) {
    return Ebay.create()[global]( val )
  }

  Ebay.prototype[global] = function ( val ) {
    const cloned = Immutable.merge(this.globals, {
      [global] : val
    })
    return Ebay.create( cloned )
  }
})

