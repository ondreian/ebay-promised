import {expect}    from "chai"
import Ebay        from "../lib"
import * as errors from "../lib/errors"
import Fields      from "../lib/definitions/fields"
import Globals     from "../lib/definitions/globals"
import Verbs       from "../lib/definitions/verbs"
import Endpoints   from "../lib/definitions/endpoints"

describe("<Ebay.Request>", function () {
  it("Ebay.Request dynamically defines Globals", function () {
    Globals.forEach( global => {
      const req = Ebay.Request.create()
      expect( function () {
        req[global]("value")
      }).to.throw(errors.Setting_Error)
    })
  })

  it("Ebay.Request dynamically defines Verbs", function () {
    const ebay = Ebay.create()
    Verbs.forEach( verb => {
      expect(Ebay.Request).to.respondTo(verb)
    })
  })

  it("Ebay.Request ~ Fields", function () {
    Fields.forEach( field => {
      expect(Ebay.Request).to.respondTo(field)
    })
  })

  it("is immutable", function () {
    const first  = Ebay.Request.create()
    const frozen = first.verb
    const second = first.GetStore()
    expect(frozen).to.deep.equal(first.verb)
  })

  it("properly receives defaults", function () {
    const req = Ebay.create().GetStore()
    expect(req).to.be.instanceOf(Ebay.Request)
    expect(req.globals).to.deep.equal(Ebay.defaults)
  })

  it("generates headers", function () {
    const req = Ebay.create().GetStore()
    expect(req.headers["X-EBAY-API-CALL-NAME"]).to.equal("GetStore")
  })

  it("throws <No_Auth_Token_Error> without authToken", function () {
    expect( function () {
      Ebay.create()[Verbs[0]]().run()
    }).to.throw(errors.No_Auth_Token_Error)

    expect( function () {
      Ebay.create().authToken("abc123")[Fields[0]](true).run()
    }).to.throw(errors.No_Call_Error)
  })

  it("finds an endpoint", function () {
    const req = Ebay.create().GetStore().ActiveList({})
    expect(req.endpoint).to.equal(Endpoints.Trading.production)
  })

  it("does not cast Listing prefixed keys to Array (issue #47)", function () {
    const req = Ebay.create().GetOrders().ListingType("fake")
    expect(req.listKey()).to.equal(false)
  })

  it.skip("Queues and rate limits", function () {
    expect(Ebay.Request).to.have.property("RATELIMIT")
  })

})

