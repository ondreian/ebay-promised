import {expect} from 'chai'

describe("Ebay = require('ebay-promised')", function () {
  it("Ebay.exports", function () {
    const Ebay = require('../lib')
    expect(Ebay).to.have.property("Request")
    expect(Ebay).to.have.property("errors")
  })
})