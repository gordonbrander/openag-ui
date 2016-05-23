/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {forward, thunk, Effects} from 'reflex';
import {identity} from '../lang/functional';
import {merge} from '../common/prelude';
import * as Unknown from '../common/unknown';

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

// Create indexed model
export const create = (models, active) => ({
  active,
  // Build an array of ordered recipe IDs
  order: orderByID(models),
  // Index all recipes by ID
  entries: indexByID(models)
});

// Add a new indexed entry to model
export const add = (model, entry) =>
  merge(model, {
    // Prepend new recipe id
    order: [getID(entry), ...model.order],
    entries: merge(model.entries, {
      [getID(entry)]: entry
    })
  });

// Given a view function and an action tagging factory function, will return
// a view that will list out all sub-views.
export const children = (view, tagByID) => (model, address) =>
  model.order.map(id => thunk(
    id,
    view,
    model.entries[id],
    forward(address, tagBy(id), model.id === model.active)
  ));

export const Activate = id => ({
  type: 'Activate',
  id
});

export const Reset = entries => ({
  type: 'Reset',
  entries
});

// @TODO handle other common indexed actions.
export const update = (model, action) =>
  action.type === 'Activate' ?
  [merge(model, {active: action.id}), Effects.none] :
  action.type === 'Reset' ?
  [create(action.entries, model.active), Effects.none] :
  Unknown.update(model, action);
