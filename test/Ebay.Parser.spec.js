import {expect} from 'chai'
import Parser   from '../lib/Parser'

describe("<Ebay.Parser>", function () {
  it("Parser.cast()", function () {
    expect(Parser.cast("true")).to.equal(true)
    expect(Parser.cast("false")).to.equal(false)
    expect(Parser.cast("1")).to.equal(1)
    expect(Parser.cast("taters")).to.equal("taters")
  })
})