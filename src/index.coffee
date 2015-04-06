# modules
async      = require 'async'
Q          = require 'q'
#api        = require 'ebay-api'
o2x        = require 'object-to-xml'
request    = require 'request-promise'
ecjson     = require "ecjson"
_          = require 'underscore'
Lazy       = require 'lazy.js'
limit      = require 'simple-rate-limiter'

# definitions
endpoints  = require './definitions/endpoints'
globals    = require './definitions/globals'
extraneous = require './definitions/extraneous'

# utils
utils      = require "./utils"

# debug namespace
debug      = require('debug')('Ebay')

# defaults for Ebay class
defaults =
  __fields__ : {}
  __globals__: {
    serviceName  : "Trading"
    sandbox      : false
    site         : 0
    app          : 'ebay-promised'
    raw          : false             # return raw XML -> JSON response from Ebay
    perPage      : 100
    callsPerEpoc : 3
    epoc         : 1000
  }


module.exports = class Ebay extends utils.Module
  # we are going to store local instances of these here for wrapping with a rate-limiter later

  @post = limit(request.post.bind(request))
  @get  = limit(request.get.bind(request))

  @include defaults
  
  @methodize require('./definitions/calls'), (method)->
    ->
      @__op__ = method
      @

  @methodize require('./definitions/fields'), (field)->
    (val)->
      return @__fields__[field] unless val

      @__fields__[field] = val
      return @

  @methodize globals, (setter)->
    (val)->
      return @__globals__[setter] unless val

      @__globals__[setter] = val
      return @
 

  constructor: (options={})->
    @safelyApplyOptions(options)

    Ebay.post.to(@callsPerEpoc()).per @epoc()
    Ebay.get.to(@callsPerEpoc()).per @epoc()
    @

  op    : -> @__op__

  fields: -> @__fields__

  reset: ->
    @__fields__ = defaults.__fields__
    @

  safelyApplyOptions: (options={})->
    @[setting](options[setting]) for setting in Object.keys(options) when @respondsTo setting

  callImmediately: (method, options)->


  endpoint : ->
    return throw new Error "unknown endpoint for serviceName #{@serviceName()}" unless endpoints[@serviceName()]
    endpoints[@serviceName()][if @sandbox() then 'sandbox' else 'production'] 

  pagination: (pageNumber = 1)->
    Pagination:
      PageNumber     : pageNumber
      EntriesPerPage : @perPage()

    
  respondsTo: (method)-> _(@[method]).isFunction()

  __inject__: (pageNumber)->
    fields = @fields()
    listKey = utils.getListKeyName fields
    debug "listKey detected:: "+ listKey if listKey
    fields[listKey] = _.extend fields[listKey], @pagination(pageNumber) if listKey
    return fields


  __build__: (pageNumber=1)->
    body    = []
    doc     = {}
    body.push RequesterCredentials: { eBayAuthToken: @authToken() }
    body.push @__inject__(pageNumber)

    doc['xml version="1.0" encoding="utf-8"?']                = null
    
    doc["#{@op()}Request xmlns=\"urn:ebay:apis:eBLBaseComponents\""] = _.extend.apply _, body
    
    return o2x(doc)
    
  __headers__: ->
    {
      'X-EBAY-API-CALL-NAME'           : @op()
      'X-EBAY-API-COMPATIBILITY-LEVEL' : '775'
      'X-EBAY-API-SITEID'              : @site()
      # 'X-EBAY-API-DEV-NAME'          : 
      'X-EBAY-API-CERT-NAME'           : @cert()
      'X-EBAY-API-APP-NAME'            : @app()
    }


  __request__: (page=1, cb)->
    debug "starting request..."
    
    options =
      url     : @endpoint()
      body    : @__build__ page
      headers : @__headers__()

    # use a singleton so even multiple instances of Ebay are rate limited 
    # then even multiple simultaneous requests go in the same queue
    
    Ebay
      .post(options)
      .once 'limiter-exec', (promise)=>
        promise
          .catch(cb)
          .then (res)=>
            debug "response recieved from eBay"
            ecjson.XmlToJson res, (json)=>
              cb null, utils.normalizeResponse.bind(@)(json)


       
  invoke: (page=1) ->
    d = Q.defer()

    # get the first page

    @__request__ page, (err, pageOne)=>
      d.reject err if err
      #return d.resolve { response: pageOne, errors: pageOne.Errors if pageOne.Errors
      return d.resolve pageOne unless pageOne.pagination && pageOne.pagination.pages > 1

      pages = [2..pageOne.pagination.pages]

      debug "Beginning pagination for pages: #{pages.join(', ')}"

      async.mapLimit pages, 2, @__request__.bind(@), (err, responses)=>
  
        return d.reject err if err

        pageOne.results = Lazy(pageOne.results).concat(Lazy(responses).pluck('results')).value()

        debug "#{pageOne.pagination.n} === #{pageOne.results.length} ?"
        d.resolve pageOne

    return d.promise