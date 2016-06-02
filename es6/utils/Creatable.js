import debug        from 'debug'

export default class Creatable {
  static create () {
    return new this(...arguments)
  }

  constructor () {
    this.debug = debug(this.constructor.name)
  }

  respondTo ( method ) {
    return this[ method ] && typeof this[ method ] === 'function'
  }
}