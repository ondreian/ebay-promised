import Promise    from "bluebird"
import ecjson     from "ecjson"
import {throws}   from "./errors"
import Extraneous from "./definitions/extraneous"
import dateNodes  from "./definitions/nodes.date"

/**
 * A collection of pure methods that are used to parse eBay API responses
 * should generally be bound to a Request via:
 *   `Function.prototype.bind`
 *   `Promise.prototype.bind`
 *  
 */
export default class Parser {
  /**
   * converts an XML response to JSON
   *
   * @param      {XML}     xml     The xml
   * @return     {Promise}         resolves to a JSON representation of the HTML 
   */
  static toJSON (xml) {
    return new Promise( (resolve, reject)=> {
      ecjson.XmlToJson( xml, resolve )
    })
  }

  /**
   * unwraps a verb Response from eBay
   * must be verbed within the context of an {Ebay.Response}
   *
   * @param      {Call}    verb    The verb
   * @return     {Object}          The unwrapped verb
   */
  static unwrap (req, json) {
    return Parser.flatten(json[ req.responseWrapper ])
  }

  /**
   * Casts text representations to Javascript representations
   *
   * @param      {String}       value   The value
   * @return     {Date|Number}          The cast value
   */
  static cast (value, key) {
    
    if (!isNaN(value)) {
      return Number(value)
    }

    if (value === "true" || value === "false") {
      return Boolean(value)
    }

    if (dateNodes[key.toLowerCase()]) {
      return new Date(value)
    }


    return value

  }

  /**
   * recursively flattens `value` keys in the XML -> JSON conversion
   * we can do this because we don't need to worry about XML attributes from eBay
   *
   * @param      {<type>}  o       { parameter_description }
   * @return     {<type>}  { description_of_the_return_value }
   */
  static flatten (o, key) {

    if (o.value) {
      return Parser.cast(o.value, key)
    }

    if (Array.isArray(o)) {
      return o.map(Parser.flatten)
    }

    if (typeof o !== "object") {
      return Parser.cast(o, key)
    }

    return Object.keys(o).reduce( (deflated, key)=> {
      deflated[key] = Parser.flatten(o[key], key)
      return deflated
    }, {})
    
  }

  /**
   * Test if any member of an Array of keys matches a given pattern
   *
   * @param      {Array}   keys    The keys
   * @param      {String}  str     The string
   * @return     {String}          returns the key or false
   */
  static keyMatch (keys, str) {
    keys = keys.slice(0)
    while (keys.length) {
      const key = keys.pop()
      if (~key.indexOf(str)) return key
    }
    return false
  }

  /**
   * flattens the eBay pagination object to be easier to deal with
   *
   * @param      {Object}  o       the JSON representation of a Response
   * @return     {Object}          the friendly pagination extended Response
   */
  static parsePagination (o) {
    if ( !o.results.PaginationResult ) return o

    const info = o.results.PaginationResult

    o.pagination = {
        pages : info.TotalNumberOfPages
      , n     : info.TotalNumberOfEntries
    }

    delete o.results.PaginationResult
    
    return o
  }
  /**
   * cleans the Ebay response up
   *
   * @param      {Object}  res     The response object
   */
  static clean (res) {

    if (res.Ack === "Error" || res.Ack === "Failure") {
      throws.Ebay_Api_Error(res.Errors)
    }

    const rootKeys = Object.keys(res).filter( key => !~Extraneous.indexOf(key) )
    const arrayKey = Parser.keyMatch(rootKeys, "Array")
    const listKey  = Parser.keyMatch(rootKeys, "List")

    const parsed = Parser.parsePagination(rootKeys.reduce( function _keyReducer (cleaned, key) {
      // Ensure we always have an Iterable interface for things that should be iterable
      if ( (~key.indexOf("Array") || ~key.indexOf("List")) && !Array.isArray(res[key]) ) {
        cleaned.results[key] = []
        return cleaned
      }

      cleaned.results[key] = res[key]
      return cleaned
    }, { results : {} }))

    if (!parsed.pagination) {
      return parsed.results
    }
  }
}