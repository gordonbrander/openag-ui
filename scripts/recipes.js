import {html, forward, Effects, Task, thunk} from 'reflex';
import * as Config from '../openag-config.json';
import PouchDB from 'pouchdb';
import * as Template from './common/stache';
import * as Database from './common/database';
import {orderByID, indexByID, add} from './common/indexed';
import * as Unknown from './common/unknown';
import {merge, tag, tagged} from './common/prelude';
import * as Modal from './common/modal';
import {cursor} from './common/cursor';
import * as ClassName from './common/classname';
import {compose, constant} from './lang/functional';
import * as RecipesForm from './recipes/form';
import * as Recipe from './recipe';

const DB = new PouchDB(Config.recipes_local);
// Export for debugging
window.RecipesDB = DB;

const ORIGIN = Template.render(Config.recipes_origin, {
  origin_url: Config.origin_url
});

// Actions and tagging functions

const ModalAction = tag('Modal');

const RecipesFormAction = action =>
  action.type === 'Back' ?
  ActivatePanel(null) :
  action.type === 'Submitted' ?
  Put(action.recipe) :
  tagged('RecipesForm', action);

const RecipeAction = (id, action) =>
  action.type === 'Activate' ?
  ActivateByID(id) :
  ({
    type: 'Recipe',
    id,
    source: action
  });

// @TODO figure out how to generalize this.
const ByID = id => action =>
  RecipeAction(id, action);

export const Restore = Database.Restore;
export const Put = Database.Put;

export const Open = ModalAction(Modal.Open);
export const Close = ModalAction(Modal.Close);

export const ActivateByID = id => ({
  type: 'ActivateByID',
  id
});

export const Activated = value => ({
  type: 'Activated',
  value
});

const ActivatePanel = id => ({
  type: 'ActivatePanel',
  id
});

// An action representing "no further action".
const NoOp = {
  type: 'NoOp'
};

const AlwaysNoOp = constant(NoOp);

// Model, update and init

export const init = () => {
  const [recipesForm, recipesFormFx] = RecipesForm.init();
  return [
    {
      active: null,
      activePanel: null,
      recipesForm,
      isOpen: false,
      // Build an array of ordered recipe IDs
      order: [],
      // Index all recipes by ID
      entries: {}
    },
    Effects.batch([
      recipesFormFx,
      Effects.receive(Restore),
      Database.DoSync(DB, ORIGIN)
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
        .map(AlwaysNoOp)
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

const syncedOk = model =>
  update(model, Restore);

// @TODO do something with sync errors.
const syncedError = model =>
  update(model, NoOp);

// Restore recipes in model from recipes array
const restoredOk = (model, recipes) => [
  merge(model, {
    // Build an array of ordered recipe IDs
    order: orderByID(recipes),
    // Index all recipes by ID
    entries: indexByID(recipes)
  }),
  Effects.none
];

// @TODO handle error case
const restoredError = (model) => [model, Effects.none];

// Activate recipe by id
const activateByID = (model, id) => [
  merge(model, {active: id}),
  Effects.receive(Activated(merge({}, model.entries[id])))
];

const activatePanel = (model, id) =>
  [merge(model, {activePanel: id}), Effects.none];

export const update = (model, action) =>
  action.type === 'RecipesForm' ?
  updateRecipesForm(model, action.source) :
  action.type === 'Modal' ?
  updateModal(model, action.source) :
  action.type === 'NoOp' ?
  [model, Effects.none] :
  action.type === 'Put' ?
  Database.put(model, DB, action.value) :
  action.type === 'Putted' ?
  (
    action.result.isOk ?
    [add(model, action.result.value), Effects.none] :
    // @TODO retry
    [model, Effects.none]
  ) :
  action.type === 'Restore' ?
  Database.restore(model, DB) :
  action.type === 'Restored' ?
  (
    action.result.isOk ?
    restoredOk(model, action.result.value) :
    restoredError(model, action.result.error)
  ) :
  action.type === 'ActivateByID' ?
  activateByID(model, action.id) :
  action.type === 'ActivatePanel' ?
  activatePanel(model, action.id) :
  action.type === 'Synced' ?
  (
    action.result.isOk ?
    syncedOk(model) :
    syncedError(model)
  ) :
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
          'panel-main-close': model.activePanel !== null
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
              onClick: () => address(ActivatePanel('form'))
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
        model.activePanel === 'form'
      )
    ])
  ]);
