import {html, forward, Effects, Task, thunk} from 'reflex';
import * as Config from '../openag-config.json';
import PouchDB from 'pouchdb';
import * as Database from './common/database';
import {orderByID, indexByID, add} from './common/indexed';
import * as Unknown from './common/unknown';
import {merge} from './common/prelude';
import * as Modal from './common/modal';
import * as ClassName from './common/classname';
import {compose, constant} from './lang/functional';
import * as Recipe from './recipe';

const DB = new PouchDB(Config.db_local_recipes);
// Export for debugging
window.RecipesDB = DB;

const ORIGIN = Config.db_origin_recipes;

// Actions

// An action representing "no further action".
const NoOp = constant({
  type: 'NoOp'
});

export const RequestRestore = Database.RequestRestore;
export const RequestPut = Database.RequestPut;

export const Open = Modal.Open;
export const Close = Modal.Close;

// Action tagging functions

const RecipeAction = (id, action) =>
  ({
    type: 'Recipe',
    id,
    source: action
  });

// @TODO figure out how to generalize this.
const ByID = id => action =>
  RecipeAction(id, action);

// Model, update and init

// Create new recipes model
const create = recipes => ({
  isOpen: false,
  // Build an array of ordered recipe IDs
  order: orderByID(recipes),
  // Index all recipes by ID
  entries: indexByID(recipes)
});

export const init = () =>
  [
    create([]),
    Effects.batch([
      Effects.receive(RequestRestore),
      Database.sync(DB, ORIGIN)
    ])
  ];

const updateByID = (model, id, action) => {
  if (model.order.indexOf(id) < 0) {
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
    Database.put(DB, action.value)
  ] :
  // Swallow RespondPut for now. It just indicates our local db write
  // was successful.
  action.type === 'RespondPut' ?
  [model, Effects.none] :
  action.type === 'RequestRestore' ?
  [model, Database.restore(DB)] :
  action.type === 'RespondRestore' ?
  [create(action.value), Effects.none] :
  // When sync completes, request in-memory restore from local db
  action.type === 'CompleteSync' ?
  [model, Effects.receive(RequestRestore)] :
  action.type === 'Open' ?
  Modal.open(model) :
  action.type === 'Close' ?
  Modal.close(model) :
  action.type === 'Recipe' ?
  updateByID(model, action.id, action.source) :
  Unknown.update(model, action);

export const view = (model, address) =>
  html.div({
    className: ClassName.create({
      'recipes-main': true,
      'recipes-main-close': !model.isOpen
    })
  }, model.order.map(id => thunk(
    id,
    Recipe.view,
    model.entries[id],
    forward(address, ByID(id))
  )));
