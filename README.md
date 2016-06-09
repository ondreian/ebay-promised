# A Promise-based module for working with the eBay API

[![Build Status](https://travis-ci.org/ondreian/ebay-promised.svg?branch=master)](https://travis-ci.org/ondreian/ebay-promised)
[![Documentation](https://doc.esdoc.org/github.com/ondreian/ebay-promised/badge.svg)](https://doc.esdoc.org/github.com/ondreian/ebay-promised/)

`npm install ebay-promised --save`

This module provides a succint, verbose way to build requests with the eBay API.

Currently it works in production applications with the eBay XML POST Trading API, and I have not properly fleshed out the other eBay services.

Most of the other services are GET based and query string driven.

## Features

- [X] Bluebird Promises
- [X] Transparent pagination
- [X] Transparent eBay compliant rate-limiting
- [X] Reasonable response parsers
- [X] Functionally tested vs the Sandbox API
- [X] ergonomic chaining API with immutability
- [X] transparently can load instance from ENV vars
- [X] proper Error subclassing to enable verbose use of `Promise.catch`

## How to use this module

Readinging through the [Functional Tests](/test/Ebay.Functional.spec.js) is a great way to familiarize yourself with some common API calls.

```javascript
# Basic Setup

import Ebay   from 'ebay-promised'
import config from './config'

const ebay  = Ebay.create(config)
const {err} = Ebay.errors

ebay
  .GetMyeBaySelling()            // Transforms it to a sealed Request, global config can no longer change
  .ActiveList({ Include: true }) // Pass in a field,value 
  .DetailLevel("ReturnAll")      // Pass in another field, value
  .run()                         // Run the request against the eBay API
  .then(handleSuccess)
  .catch(err.Ebay_Api_Error, err => {
    // this error is a special case 
    // it means your HTTP request was successful but eBay did not like it
  })
  .catch( err = {
    // catch all other errors ala:
    // Network Errors
  })

// Ebay can also load your credentials from `process.env`

const envEbay = Ebay.fromEnv()

```

### Supported Calls

All calls, fields, and globals that are currently defined live in `./es6/definitions`

If you find a call that is missing, feel free to open an issue so it can be addressed, or make a pull request.

### Pagination

Internally ebay-promised will attempt to detect when a request is paginated and go ahead and grab the subsequent pages for you and concatenate the results.

### Utility methods

Pull requests are welcome.