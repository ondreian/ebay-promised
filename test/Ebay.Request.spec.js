import {expect}    from "chai"
import Ebay        from "../lib"
import * as errors from "../lib/errors"
import Fields      from "../lib/definitions/fields"
import Globals     from "../lib/definitions/globals"
import Verbs       from "../lib/definitions/verbs"
import Endpoints   from "../lib/definitions/endpoints"

function builder (def, take=100) {
  const desc    = def.slice(0,take).sort( (a,b)=> b.length - a.length )
  const longest = desc[0].length
  return desc.map( val => {
    return [val, Array(longest - val.length + 1).fill(0).map( padding => " " ).join("") ]
  })
}

describe("Ebay.Request", function () {
  describe("Ebay.Request ~ Globals", function () {
    builder(Globals).forEach( ([omni, padding]) => {
      it(`Ebay.Request.prototype.${omni}(Value)${padding} -> throws <Setting_Error>`, ()=> {
        const req = Ebay.Request.create()
        expect( function () {
          req[omni]("value")
        }).to.throw(errors.Setting_Error)
      })
    })
  })

  describe("Ebay.Request ~ Verbs", function () {
    const ebay = Ebay.create()

    builder(Verbs).forEach( ([verb, padding]) => {
      it(`Ebay.Request.prototype.${verb}()${padding} -> return <Ebay.Request>`, ()=> {
        const immutable = ebay[verb]()
        expect(immutable.verb).to.not.equal(ebay.verb)
      })
    })
  })

  describe("Ebay.Request ~ Fields", function () {
    builder(Fields).forEach( ([field,padding]) => {
      it(`Ebay.Request.prototype.${field}(Value)${padding} -> return <Ebay.Request>`, ()=> {
        expect(Ebay.Request).to.respondTo(field)
      })
    })
  })

  describe("Ebay.Request ~ Core", function () {
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

    it("Queues and rate limits", function () {
      expect(Ebay.Request).to.have.property("RATELIMIT")
    })
  })
})

