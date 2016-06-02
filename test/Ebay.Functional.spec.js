import {expect}    from "chai"
import Ebay        from "../lib"
import * as errors from "../lib/errors"
import Fields      from "../lib/definitions/fields"
import Globals     from "../lib/definitions/globals"
import Calls       from "../lib/definitions/calls"
import Endpoints   from "../lib/definitions/endpoints"

describe("Ebay Functionality", function () {
  const ebay = Ebay.create({
      authToken : process.env.EBAY_TOKEN
    , cert      : process.env.EBAY_CERT
    , app       : process.env.EBAY_APP_ID
    , devName   : process.env.EBAY_DEV_ID
    , sandbox   : true
  })

  it("is running in sanbox", function () {
    expect(ebay.GetAccount().endpoint).to.equal(Endpoints.Trading.sandbox, "COULD NOT FIND SANDBOX")
  })

  it("throw proper error class", function (done) {
    ebay.GetAccount().run()
      .then( ()=> {
        throw new Error("this shouldn't have happened")
      })
      .catch( err => {
        expect(err).to.be.instanceOf(errors.Ebay_Api_Error)
        done()
      })
  
  })

  it.only("handles Lists", function (done) {
    ebay.GetBidderList().run()
      .then( res => {
        expect(res.BidItemArray).to.be.array
        done()
      })
      .catch(done)
  })

  it("casts to Number", function (done) {
    ebay.GetSuggestedCategories().Query("men's").run()
      .then( res => {
        expect(res.CategoryCount).to.be.number
        done()
      })
      .catch(done)
  })

  it("handles large sets", function (done) {
    ebay.GeteBayDetails().run()
      .then( (res)=> {
        console.log(res.PaymentOptionDetails)
        done()
      })
      .catch(done)
  })

  /*ebay
      .GetCategories()
      .DetailLevel("ReturnAll")
      .run()
      .then( res => {
        console.log(res)
        done()
      })
      .catch(done)*/

})

