import {html, forward, Effects, Task, thunk} from 'reflex';
import * as Config from '../openag-config.json';
import PouchDB from 'pouchdb';
import * as Database from './common/db';
import {orderByID, indexByID, add} from './common/indexed';
import * as Unknown from './common/unknown';
import {merge, tag, tagged} from './common/prelude';
import * as Modal from './common/modal';
import {cursor} from './common/cursor';
import * as ClassName from './common/classname';
import {compose, constant} from './lang/functional';
import * as RecipesForm from './recipes/form';
import * as Recipe from './recipe';

const DB = new PouchDB(Config.db_local_recipes);
// Export for debugging
window.RecipesDB = DB;

const ORIGIN = Config.db_origin_recipes;

// Actions

const ModalAction = tag('Modal');

const RecipesFormAction = action =>
  action.type === 'Back' ?
  Activate(null) :
  tagged('RecipesForm', action);

// An action representing "no further action".
const NoOp = constant({
  type: 'NoOp'
});

export const RequestRestore = Database.RequestRestore;
export const RequestPut = Database.RequestPut;

export const Open = ModalAction(Modal.Open);
export const Close = ModalAction(Modal.Close);

const Activate = id => ({
  type: 'Activate',
  id
});

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

// Restore recipes in model from recipes array
const restore = (model, recipes) =>
  merge(model, {
    // Build an array of ordered recipe IDs
    order: orderByID(recipes),
    // Index all recipes by ID
    entries: indexByID(recipes)
  });

export const init = () => {
  const [recipesForm, recipesFormFx] = RecipesForm.init();
  return [
    {
      active: null,
      recipesForm,
      isOpen: false,
      // Build an array of ordered recipe IDs
      order: [],
      // Index all recipes by ID
      entries: {}
    },
    Effects.batch([
      recipesFormFx,
      Effects.receive(RequestRestore),
      Database.sync(DB, ORIGIN)
    ])
  ];
};

const updateModal = cursor({
  update: Modal.update,
  tag: ModalAction
});

const updateRecipesForm = cursor({
  get: model => model.recipesForm,
  set: (model, recipesForm) => merge(model, {recipesForm}),
  update: RecipesForm.update,
  tag: RecipesFormAction
});

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
  action.type === 'RecipesForm' ?
  updateRecipesForm(model, action.source) :
  action.type === 'Modal' ?
  updateModal(model, action.source) :
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
  [restore(model, action.value), Effects.none] :
  // When sync completes, request in-memory restore from local db
  action.type === 'CompleteSync' ?
  [model, Effects.receive(RequestRestore)] :
  action.type === 'Activate' ?
  [merge(model, {active: action.id}), Effects.none] :
  action.type === 'Recipe' ?
  updateByID(model, action.id, action.source) :
  Unknown.update(model, action);

export const view = (model, address) =>
  html.dialog({
    className: ClassName.create({
      'modal-main': true,
      'modal-main-close': !model.isOpen
    }),
    open: (model.isOpen ? 'open' : void(0))
  }, [
    html.div({
      className: 'panels-main'
    }, [
      html.div({
        className: ClassName.create({
          'panel-main': true,
          'panel-main-close': model.active !== null
        })
      }, [
        html.header({
          className: 'panel-header'
        }, [
          html.h1({
            className: 'panel-title'
          }, [
            // @TODO internationalize this
            'Recipes'
          ]),
          html.div({
            className: 'panel-nav-right'
          }, [
            html.a({
              className: 'recipes-create-icon',
              onClick: () => address(Activate('form'))
            })
          ])
        ]),
        html.div({
          className: 'panel-content'
        }, [
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
          )))
        ])
      ]),
      thunk(
        'recipes-form',
        RecipesForm.view,
        model.recipesForm,
        forward(address, RecipesFormAction),
        model.active === 'form'
      )
    ])
  ]);
