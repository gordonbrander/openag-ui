/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {identity} from '../lang/functional';

// Build an index object from an array.
// Returns a new index object.
export const indexWith = (array, mapKey, mapValue) => {
  const index = {};
  for (let object of array) {
    // Derive key using `mapKey`, then use it to assign value derived from
    // `mapValue`.
    index[mapKey(object)] = mapValue(object);
  }
  return index;
}

// Create a "getter" function that will get a particular key for an object.
export const getter = key => object => object[key];

export const getID = getter('_id');

export const indexByID = array => indexWith(array, getID, identity);
export const orderByID = array => array.map(getID);

// Add a new indexed entry to model
export const add = (model, entry) =>
  merge(model, {
    // Prepend new recipe id
    order: [getID(entry), ...model.order],
    entries: merge(model.entries, {
      [getID(entry)]: entry
    })
  });
