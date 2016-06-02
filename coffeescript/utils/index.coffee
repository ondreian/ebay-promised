# reserve module words
Lazy = require 'lazy.js'
_    = require 'underscore'

# debug namespace
debug      = require('debug')('Ebay')

extraneous = require '../definitions/extraneous'

moduleKeywords = ['extended', 'included', 'methodize']

utils = {}

utils.normalizeMethodName = (method)->
  method = method[0].toLowerCase() + method.substring(1)
  method


utils.Module = class Module
  @extend: (obj) ->
    for key, value of obj when key not in moduleKeywords
      @[key] = value

    obj.extended?.apply(@)
    @

  @include: (obj) ->
    for key, value of obj when key not in moduleKeywords
      # Assign properties to the prototype
      @::[key] = value
    obj.included?.apply(@)
    @

  @methodize: (methods, fn)->
    for method in methods when method not in moduleKeywords
      @::[utils.normalizeMethodName(method)] = fn(method)
    @

  @defineGetter: (name, getter)-> 
    @::__defineGetter__ name, getter 

  @defineSetter: (name, setter)-> 
    @::__defineSetter__ name, setter

utils.firstKey = (o)->
  o[Object.keys(o)[0]]

utils.parsePagination = (o)->
  throw new Error "utils.parsePagination called on Object without `PaginationResult` key" unless o.PaginationResult
  return {
    pages : o.PaginationResult.TotalNumberOfPages.value
    n     : o.PaginationResult.TotalNumberOfEntries.value
  }

utils.getArrayKey = (o)->
  return utils.firstKey(o[key]) for key in Object.keys(o) when Lazy(key).contains "Array"


utils.getListKey  = (o)->
  return o[key] for key in Object.keys(o) when Lazy(key).contains "List"

utils.getListKeyName = (o)->
  return key for key in Object.keys(o) when Lazy(key).contains "List"
  return null

utils.normalizeResponse = (results, cb)->
  parsed = {}
  #delete results[key] for key in extraneous
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

utils.flatten = (o)->
  try
    return o.value if o.value 

    if Array.isArray(o)
      return o.map utils.flatten

    else
      
      memo = {}
      for key in Object.keys(o)
        memo[key] = if o[key].value then o[key].value else utils.flatten(o[key])
      
      return memo
  catch err
    return o

module.exports = utils