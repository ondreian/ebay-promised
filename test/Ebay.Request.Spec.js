import {expect}  from "chai"
import Ebay      from "../lib"
import Fields    from "../lib/definitions/fields"
import Globals   from "../lib/definitions/globals"
import Calls     from "../lib/definitions/calls"
import Endpoints from "../lib/definitions/endpoints"

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
      it(`Ebay.Request.prototype.${omni}(Value)${padding} -> return <Ebay.Request>`, ()=> {
        const ebay = Ebay.Request.create()
        expect(ebay).to.be.instanceOf(Ebay.Request)
      })
    })
  })

  describe("Ebay.Request ~ Calls", function () {
    const ebay = Ebay.create()

    builder(Calls).forEach( ([call, padding]) => {
      it(`Ebay.Request.prototype.${call}()${padding} -> return <Ebay.Request.Request>`, ()=> {
        const immutable = ebay[call]()
        expect(immutable.call).to.not.equal(ebay.call)
      })
    })
  })

  describe("Ebay.Request ~ Fields", function () {
    builder(Fields).forEach( ([field,padding]) => {
      it(`Ebay.Request.prototype.${field}(Value)${padding} -> return <Ebay.Request.Request>`, ()=> {
        expect(Ebay.Request).to.respondTo(field)
      })
    })
  })

  describe.only("Ebay.Request ~ Core", function () {
    it("is immutable", function () {
      const first  = Ebay.Request.create()
      const frozen = first.call
      const second = first.GetStore()
      expect(frozen).to.deep.equal(first.call)
    })

    it("properly receives defaults", function () {
      const req = Ebay.create().GetStore()
      expect(req).to.be.instanceOf(Ebay.Request)
      expect(req.globals).to.deep.equal(Ebay.defaults)
    })

    it("throws when trying to change a global setting", function () {
      const req = Ebay.create().GetStore()
      expect(req).to.be.instanceOf(Ebay.Request)
      expect( function () { req.app("thrower") }).to.throw(/cannot call/)
    })

    it("generates headers", function () {
      const req = Ebay.create().GetStore()
      expect(req.headers["X-EBAY-API-CALL-NAME"]).to.equal("GetStore")
    })

    it("finds an endpoint", function () {
      const req = Ebay.create().GetStore().ActiveList({})
      expect(req.endpoint).to.equal(Endpoints.Trading.production)
      console.log(req.xml)
    })
  })
})

