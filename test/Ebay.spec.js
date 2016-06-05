import {expect} from 'chai'
import Ebay     from '../lib'
import fields   from '../lib/definitions/fields'
import globals  from '../lib/definitions/globals'
import verbs    from '../lib/definitions/verbs'

function builder (def, take=100) {
  const desc    = def.slice(0,take).sort( (a,b)=> b.length - a.length )
  const longest = desc[0].length
  return desc.map( val => {
    return [val, Array(longest - val.length + 1).fill(0).map( padding => " " ).join('') ]
  })
}

describe("Ebay", function () {
  describe("Ebay ~ Globals", function () {
    builder(globals).forEach( ([omni, padding]) => {
      it(`Ebay.prototype.${omni}(Value)${padding} -> return <Ebay>`, ()=> {
        const ebay = Ebay[omni](true)
        expect(ebay).to.be.instanceOf(Ebay)
      })
    })
  })

  describe("Ebay ~ Verbs", function () {
    builder(verbs).forEach( ([verb, padding]) => {
      it(`Ebay.prototype.${verb}()${padding} -> return <Ebay.Request>`, ()=> {

      })
    })
  })

  describe("Ebay ~ Fields", function () {
    builder(fields).forEach( ([field,padding]) => {
      it(`Ebay.prototype.${field}(Value)${padding} -> return <Ebay.Request>`, ()=> {
        expect(Ebay).to.respondTo(field)
        const req = Ebay[field](true)
        expect(req).to.be.instanceOf(Ebay.Request)
        expect(req.fields[field]).to.be.true
        req[field](false)
        expect(req.fields[field]).to.be.false
      })
    })
  })

  describe("Ebay ~ Immutability", function () {
    it("returns a new composed instance", function () {
      const first  = Ebay.create()
      const frozen = Object.assign({}, first.globals)
      const second = first.sandbox(true)
      expect(frozen).to.deep.equal(first.globals)
    })
  })
})