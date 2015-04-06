# A promise based wrapper for the eBay API

This module provides a succint, verbose way to build requests with the eBay API.  
Currently it works in production applications with the eBay XML POST Trading API, and I have not properly fleshed out the other eBay services.
Most of the other services are GET based and query string driven.

## How to use this module

```coffeescript
# Basic Setup

config = 
  ruName       : 'example123'
  cert         : 'exampleCert123'
  devName      : 'exampleDevName'
  authToken    : 'accesstoken123'
  sandbox      : true
  epoc         : 1000             # MS
  callsPerEpoc : 1                # number of requests per epoc


Ebay  = require 'ebay-promised'
ebay  = new Ebay(config)      # you can pass in configuration in initializiation


# or call it down the line
ebay = (new Ebay)
  .ruName(config.ruName)   
  .cert(config.cert)
  .devName(config.devName) 
  .sandbox(config.sandbox)         # will now use the eBay sandbox site
  .authToken(config.authToken)     # the user token to authenticate with against the API
  .serviceName('Trading')          # the service to use
```

Now let's set up a call

```coffeescript

ebay
  .getCategories()            # a call from the Ebay trading API (http://developer.ebay.com/devzone/xml/docs/reference/ebay/getcategories.html)
  .detailLevel('ReturnAll')   # an option for the getCategories call
  .levelLimit(1)              # another option
  .invoke()                   # says you are done building the request, and makes it to ebay returns a Q promise
  .fail(handleError)          # what to do if your request fails
  .then(handleCategories)     # what to do when your request succeeds

```

### Supported Calls

All calls that are currently defined live in ebay-promised/definitions/src/calls
if you find a call that is missing, feel free to open an issue so it can be addressed, or make a pull request

### Rate Limiting

ebay-promised handles rate-limiting internally, with a default limit of 3 calls per second.

To override these settings you can pass in the config.epoc and a config.callsPerEpoc options

### Pagination

Internally ebay-promised will attempt to detect when a request is paginated and go ahead and grab the subsequent pages for you and concatenate the results

### Utility methods

Ebay#respondsTo
  - this method is to test if a method exists for eBay

Ebay#reset
  - this method resets the fields for the api

Ebay#__build__
  - this is an internal method usually, but it will return the current state of the XML document to be POSTed to eBay


Pull requests are welcome.

#### TODOs

- Add full support for other Ebay API services
- Add tests