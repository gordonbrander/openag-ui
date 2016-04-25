import {html, forward, Effects, Task} from 'reflex';
import * as Config from '../openag-config.json';
import PouchDB from 'pouchdb';
import {put, restore, RequestRestore} from './common/db';
import {indexWith, getter} from './common/indexed';
import * as Unknown from './common/unknown';
import {merge} from './common/prelude';
import {compose} from './lang/functional';
import * as Recipe from './recipe';

const DB = new PouchDB(Config.db_local_recipes);
// Export for debugging
window.RecipesDB = DB;

// Automatically sync between local db and origin (single-board computer) DB.
// @TODO this works, but should we pipe sync operations through the
// effects system instead?
// @TODO we need to send incoming changes through effects system, to update
// model.
//DB.sync(Config.db_origin_recipes, {
  //live: true,
  //retry: true
//});

// Create getter function for recipe ID.
const getID = getter('_id');

const Model = recipes => ({
  // Index all recipes by ID
  entries: indexWith(recipes, getID, Recipe.init)
});

export const init = recipes =>
  [
    Model(recipes),
    Effects.receive(RequestRestore)
  ];

export const update = (model, action) =>
  action.type === 'RequestPut' ?
  [
    merge(model, {
      entries: merge(model.entries, {
        [action.recipe._id]: action.recipe
      })
    }),
    put(DB, action.recipe)
  ] :
  // Swallow RespondPut for now. It just indicates our local db write
  // was successful.
  action.type === 'RespondPut' ?
  [model, Effects.none] :
  action.type === 'RequestRestore' ?
  [model, restore(DB)] :
  action.type === 'RespondRestore' ?
  [Model(action.value), Effects.none] :
  Unknown.update(model, action);
