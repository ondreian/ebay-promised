import Creatable   from './utils/Creatable'
import Request     from './Request'
import * as Errors from './errors'

// dynamic definitions aggregated from crawling Ebay's API docs
import Endpoints   from './definitions/endpoints'
import Fields      from './definitions/fields'
import Globals     from './definitions/globals'
import Calls       from './definitions/calls'

export default class Ebay extends Creatable {
  /**
   * { constructor_description }
   *
   * @param      {Object}  config  The configuration
   * @return     {Ebay}
   */
  constructor ( settings ) {
    super()
    /**
     * global settings for all following Ebay requests
     */
    this.globals  = Object.assign({}, Ebay.defaults, settings)
  }
}

Ebay.defaults = {
    serviceName  : "Trading"
  , sandbox      : false
  , site         : 0
  , raw          : false      // return raw XML -> JSON response from Ebay
  , perPage      : 100
  , callsPerEpoc : 3
  , epoc         : 1000
}

Ebay.Request = Request

Calls.forEach( call => {
  Ebay[call] = function _dynamicCall () {
    return Ebay.create()[call]()
  }

  Ebay.prototype[call] = function _dynamicCall () {
    return Ebay.Request.create(this)[call]()
  }

})

Fields.forEach( field => {
  Ebay[field] = function _dynamicField ( val ) {
    return Ebay
      .create()[field](val)
  }

  Ebay.prototype[field] = function _dynamicField (val) {
    return Ebay.Request.create(this)[field](val)
  }
})

Globals.forEach( omni => {
  Ebay[omni] = function _dynamicOmni ( val ) {
    return Ebay.create()[omni](val)
  }

  Ebay.prototype[omni] = function _dynamicOmni (val) {
    const settings = Object.assign({}, this.globals)
    settings[omni] = val
    return Ebay.create( settings )
  }
})

