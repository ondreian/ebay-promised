import {expect}    from "chai"
import Promise     from "bluebird"
import Ebay        from "../lib"
import Endpoints   from "../lib/definitions/endpoints"
import * as errors from "../lib/errors"
import * as mock   from './fixtures/generators'

process.env.EBAY_SANDBOX = true

describe("<Ebay> => Functional Testing", function () {
  // Load encrypted creds on CI

  let env;
  try {
    env = require('./fixtures/auth.private.js')
    Object.keys(env).forEach( v => process.env[v] = env[v] )
  } catch (err) {
    // pass
  }

  let ebay;
  try {
    ebay = Ebay.fromEnv();
  } catch (err) {
    console.warn(`
      Unable to initialize Ebay object, skipping functional tests.
      Need environment or test/fixtures/auth.private.js containing:
      EBAY_APP_ID, EBAY_DEV_ID, EBAY_CERT, EBAY_TOKEN
    `);
  }
  const skipTests = !ebay;

  before(function () {
    if (skipTests) {
      this.skip();
    }
  });

  it("is running in sandbox", function () {
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

  it("creates listings", function (done) {
    const items = Array(3).fill(0).map(mock.Item)
    Promise.resolve(items)
      .map( item => ebay.Item(item).AddFixedPriceItem().run() )
      .then( _ => done() )
      .catch(done)
  })

  it("handles Lists", function (done) {
    ebay
      .GetBidderList()
      .run()
      .then( res => {
        expect(res.results).to.be.an("array")
        done()
      })
      .catch(done)
  })

  it("casts CategoryCount to Number", function (done) {
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

  let listingIds = []

  it("handles pagination", function (done) {
    this.timeout( 1000 * 60 * 2 )

    ebay
      .perPage(1)
      .GetMyeBaySelling()
      .ActiveList({ Include: true })
      .run()
      .then(res => {
        // collect listing ids for deletion
        res.results.forEach( listing => listingIds.push(listing.ItemID) )
        expect(res.results).to.be.an("array")
        expect(res.pagination.length).to.equal(res.results.length)
        expect(res.results).to.be.have.length.greaterThan(1)
        done()
      })
      .catch(done)
  })

  it("deletes listings", function (done){
    Promise.resolve(listingIds)
      .map( id => ebay.ItemID(id).EndingReason("LostOrBroken").EndFixedPriceItem() )
      .map( req => req.run().catch(errors.Ebay_Api_Error, err => null ) )
      .then( _ => done() )
      .catch(done)
  })
})
