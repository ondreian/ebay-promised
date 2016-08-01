import {expect} from 'chai'
import Ebay     from '../lib'
import Fields   from '../lib/definitions/fields'
import Globals  from '../lib/definitions/globals'
import Verbs    from '../lib/definitions/verbs'

describe("<Ebay>", function () {
  it("Ebay ~ Globals", function () {
    Globals.forEach( global => {     
      expect(Ebay).to.respondTo(global)
      expect(Ebay).itself.to.respondTo(global)
      expect(Ebay[global]()).to.be.instanceOf(Ebay)
    })
  })

  it("Ebay ~ Verbs", function () {
    Verbs.forEach( verb => {
      expect(Ebay).to.respondTo(verb)
      expect(Ebay).itself.to.respondTo(verb)
      expect(Ebay[verb]()).to.be.instanceOf(Ebay.Request)
    })
  })

  it("Ebay ~ Fields", function () {
    Fields.forEach( field => {      
      expect(Ebay).to.respondTo(field)
      expect(Ebay).itself.to.respondTo(field)
      const req = Ebay[field](true)
      expect(req).to.be.instanceOf(Ebay.Request)
      expect(req.fields[field]).to.be.true
      req[field](false)
      expect(req.fields[field]).to.be.false
    })
  })

  it("Ebay is immutable", function () {    
    const first  = Ebay.create()
    const frozen = Object.assign({}, first.globals)
    const second = first.sandbox(true)
    expect(frozen).to.deep.equal(first.globals)
  })
})