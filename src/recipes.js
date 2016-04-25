import {html, forward, Effects, Task, thunk} from 'reflex';
import * as Config from '../openag-config.json';
import PouchDB from 'pouchdb';
import {put, restore, RequestRestore} from './common/db';
import {indexWith, getter, tagID} from './common/indexed';
import * as Unknown from './common/unknown';
import {merge} from './common/prelude';
import {compose, constant} from './lang/functional';
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

// Actions

// An action representing "no further action".
const NoOp = constant({
  type: 'NoOp'
});

const RecipeAction = (id, action) =>
  ({
    type: 'Recipe',
    id,
    source: action
  });

// @TODO figure out how to generalize this.
const ByID = (type, id) => action =>
  RecipeAction(id, action);

// Create getter function for recipe ID.
const getID = getter('_id');

const Model = recipes => ({
  // Build an array of ordered recipe IDs
  order: recipes.map(getID),
  // Index all recipes by ID
  entries: indexWith(recipes, getID, Recipe.init)
});

export const init = () =>
  [
    Model([]),
    Effects.receive(RequestRestore)
  ];

// Add new recipe to model
const add = (model, recipe) =>
  merge(model, {
    // Prepend new recipe id
    order: [recipe._id, ...model.order],
    entries: merge(model.entries, {
      [recipe._id]: recipe
    })
  });

// @TODO generalize this for all list models.
const updateByID = (model, id, action) => {
  if ( model.order.indexOf(id) < 0) {
    return [
      model,
      Effects
        .task(Unknown.error(`model with id: ${id} is not found`))
        .map(NoOp)
    ];
  }
  else {
    const [entry, fx] = Recipe.update(model.entries[id], action);
    return [
      merge(model, {entries: merge(model.entries, {[id]: entry})}),
      fx.map(ByID(id))
    ];
  }
}

export const update = (model, action) =>
  action.type === 'NoOp' ?
  [model, Effects.none] :
  action.type === 'RequestPut' ?
  [
    add(model, action.value),
    put(DB, action.value)
  ] :
  // Swallow RespondPut for now. It just indicates our local db write
  // was successful.
  action.type === 'RespondPut' ?
  [model, Effects.none] :
  action.type === 'RequestRestore' ?
  [model, restore(DB)] :
  action.type === 'RespondRestore' ?
  [Model(action.value), Effects.none] :
  action.type === 'Recipe' ?
  updateByID(model, action.id, action.source) :
  Unknown.update(model, action);

export const view = (model, address) =>
  html.div({
    className: 'recipes-main'
  }, model.order.map(id => thunk(
    id,
    Recipe.view,
    model.entries[id],
    forward(address, ByID(id))
  )));
