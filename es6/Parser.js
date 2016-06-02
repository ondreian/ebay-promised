import Promise    from "bluebird"
import Lazy       from "lazy.js"
import ecjson     from "ecjson"

import {throws}   from "./errors"

import Extraneous from "./definitions/extraneous"

export default class Parser {
  static toJSON (xml) {
    return new Promise( (resolve, reject)=> {
      ecjson.XmlToJson( xml, resolve )
    })
  }

  static unwrap (call) {
    return function unwrapper (json) { 
      return json[`${call}Response`] 
    }
  }

  static cast (value) {
    
    if (!isNaN(value)) {
      return Number(value)
    }

    return value

  }

  static flatten (o) {

    if (o.value) {
      return Parser.cast(o.value)
    }

    if (Array.isArray(o)) {
      return o.map(Parser.flatten)
    }

    if (typeof o !== "object") {
      return Parser.cast(o)
    }

    return Object.keys(o).reduce( (deflated, key)=> {
      deflated[key] = Parser.flatten(o[key])
      return deflated
    }, {})
    
  }

  static keyMatch (keys, str) {
    keys = keys.slice(0)
    while (keys.length) {
      const key = keys.pop()
      if (~key.indexOf(str)) return key
    }
    return false
  }

  static parsePagination (o) {
    if ( !o.PaginationResult ) return o

    o.pagination = {
        pages : o.PaginationResult.TotalNumberOfPages
      , n     : o.PaginationResult.TotalNumberOfEntries
    }

    delete o.PaginationResult
    
    return o
  }
  /**
   * cleans the Ebay response up
   *
   * @param      {<type>}  res     The resource
   */
  static clean (res) {
    
    res = Parser.flatten(res)

    if (res.Ack === "Error" || res.Ack === "Failure") {
      throws.Ebay_Api_Error(res.Errors)
    }

    const rootKeys = Object.keys(res).filter( key => !~Extraneous.indexOf(key) )
    const arrayKey = Parser.keyMatch(rootKeys, "Array")
    const listKey  = Parser.keyMatch(rootKeys, "List")

    return Parser.parsePagination(rootKeys.reduce( function _keyReducer (cleaned, key) {
      // Ensure we always have an Iterable interface for things that should be iterable
      if ( (~key.indexOf("Array") || ~key.indexOf("List")) && !Array.isArray(res[key]) ) {
        cleaned[key] = []
        return cleaned
      }

      cleaned[key] = res[key]
      return cleaned
    }, {}))

  }

  /*static parse (json) {
    parsed = {}
    //delete results[key] for key in extraneous
    root = results["#{@op()}Response"]
    keys = Lazy Object.keys root
    delete root[key] for key in extraneous
        
    list = utils.getListKey(root)

    return utils.flatten(root) unless list

    parsed.pagination = utils.parsePagination list
    arr   = utils.getArrayKey list

    parsed.results   = if Array.isArray(arr) then arr else [arr]
    parsed.results   = utils.flatten(parsed.results)

    return parsed
  }*/
}