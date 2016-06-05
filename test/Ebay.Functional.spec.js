import {expect}    from "chai"
import Ebay        from "../lib"
import * as errors from "../lib/errors"
import Fields      from "../lib/definitions/fields"
import Globals     from "../lib/definitions/globals"
import Verbs       from "../lib/definitions/verbs"
import Endpoints   from "../lib/definitions/endpoints"

process.env.EBAY_SANDBOX = true

describe("Ebay Functionality", function () {
  // Load encrypted creds on CI
  if (process.env.TRAVIS) {
    Object.keys(require('./fixtures/auth.js')).forEach( v => process.env[v] = env[v] )
  }

  const ebay = Ebay.fromEnv()

  it("is running in sanbox", function () {
    expect(ebay.GetAccount().endpoint).to.equal(Endpoints.Trading.sandbox, "COULD NOT FIND SANDBOX")
  })

  it("throw proper error class", function (done) {
    ebay
      .GetAccount()
      .run()
      .then( ()=> {
        throw new Error("this shouldn't have happened")
      })
      .catch( err => {
        expect(err).to.be.instanceOf(errors.Ebay_Api_Error)
        done()
      })
  
  })

  it("handles Lists", function (done) {
    ebay
      .GetBidderList()
      .run()
      .then( res => {
        expect(res.BidItemArray).to.be.array
        done()
      })
      .catch(done)
  })

  it("casts to Number", function (done) {
    ebay
      .GetSuggestedCategories()
      .Query("men's")
      .run()
      .then( res => {
          expect(res.CategoryCount).to.be.a("number")
          done()
        })
      .catch(done)
  })

  it("casts to Date", function (done) {
    ebay
      .GetBidderList()
      .run()
      .then( res =>  {
        expect(res.Bidder.RegistrationDate).to.be.a("date")
        done()
      }).catch(done)
  })

  it.skip("does pagination", function (done) {
    ebay
      .GetCategories()           
      .DetailLevel('ReturnAll')   
      .LevelLimit(1)
      .run( res => {
        console.log(res)
        done()
      })
      .catch(done)
  })

  it("handles pagination", function (done) {
    ebay
      .GetMyMessages()
      .DetailLevel("ReturnMessages")
      .run()
      .then( res => {

        expect(res.BidItemArray).to.be.an("array")
        done()
      })
      .catch(done)
  })

})

