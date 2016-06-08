/**
 * Immutable helpers
 * 
 * This is a naive implementation since we only care about Objects
 * If we move to handling Arrays we will need to account for that.
 * 
 */
export default class Immutable {

  /**
   * merges a collection of objects into a new Object
   *
   * @param      {Array}   objects  The objects to merge
   * @return     {Object}           The result
   */ 
  static merge (...objects) {
    return Object.assign.apply(null, [{}].concat(objects))
  }

  /**
   * makes a copy of an Object
   *
   * @param      {Object}  obj     The object to copy
   * @return     {Object}          The copy
   */
  static copy (obj) {
    return Object.assign({}, obj)
  }

}