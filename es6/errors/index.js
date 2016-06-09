import Extendable_Error from 'es6-error'

/**
 * Error object for ease of capturing if some service depends on .toJSON() method to log something
 * 
 * @ignore
 */
class Error extends Extendable_Error {

  /**
   * returns a JSON representation of the Error
   *
   * @return     {Object}  json representation of the Error
   */
  toJSON () {
    return {
        message : this.message
      , stack   : this.stack
      , type    : this.constructor.name
      , meta    : this.meta || null
    }
  }
}


/**
 * thrown when Request.prototype.run() is called without an authToken
 *
 * @class      No_Auth_Token (name)
 */
export class No_Auth_Token_Error extends Error {
  constructor(msg = "no authToken present.  Please invoke `Ebay.prototype.authToken(<Token>)`.") {
    super(msg)
  }
}

/**
 * thrown when Request.prototype.run() is called without having defined an eBay API call
 */

export class No_Call_Error extends Error {
  constructor(msg = "no eBay API call defined, please invoke one.") {
    super(msg)
  }
}

/**
 * thrown when attempting to change a setting that cannot be changed
 *
 * @param {String} setting    the setting that was attempted
 */

export class Setting_Error extends Error {
  constructor (setting) {
    super(`cannot configure "state.${setting}" at this time, are you trying to define a Global on a Request?`)
  }
}

/**
 * thrown when attempting to load environment variables that don't exist
 */
export class Env_Error extends Error {
  constructor (key) {
    super(`could not find ${key} in process.env`)
  }
}


/**
 * Thrown when an Error occurs on eBay's side.
 * Allows for easier control flow with Promises
 * 
 * @example
 * 
 * Ebay
 *  .create(config)
 *  .GetSellerList()
 *  .run()
 *  .catch(errors.Ebay.Api_Error, App.handleErr)
 *  .catch( function (other_error) {
 *    handle(other_error)
 *  })
 */
export class Ebay_Api_Error extends Error {
  constructor (err) {
    super(err.LongMessage || err.ShortMessage)
    this.meta = err
  }
}


/**
 * convenience methods for Error creation
 * 
 * @ignore
 * @type {Object}
 * 
 * @example
 *  throws.Error("an error message")
 *  throws.No_Auth_Token()
 */
export const throws = Object.keys(exports).reduce( (thrower, err) => {
  if (err === "throws") return thrower
  const cstr = exports[err]
  thrower[err] = function _thrower () {  throw new cstr(...arguments) }
  return thrower
}, {})