import {html, forward, Effects, Task, thunk} from 'reflex';
import * as Config from '../openag-config.json';
import PouchDB from 'pouchdb-browser';
import * as Template from './common/stache';
import * as Database from './common/database';
import * as Indexed from './common/indexed';
import * as Unknown from './common/unknown';
import * as Result from './common/result';
import * as Banner from './common/banner';
import {merge, tag, tagged, batch} from './common/prelude';
import * as Modal from './common/modal';
import {cursor} from './common/cursor';
import {classed, toggle} from './common/attr';
import {localize} from './common/lang';
import {compose, constant} from './lang/functional';
import * as RecipesForm from './recipes/form';
import * as Recipe from './recipe';

const DB = new PouchDB(Config.recipes.local);
// Export for debugging
window.RecipesDB = DB;

const getPouchID = Indexed.getter('_id');

// Actions and tagging functions

const TagModal = tag('Modal');

const TagBanner = source => ({
  type: 'Banner',
  source
});

const FailRecipeStart = TagBanner(Banner.AlertDismissable("Blarg! Couldn't start recipe"));

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

const ByID = id => action =>
  RecipeAction(id, action);


// "Restore from above". This action handles information restored from the
// parent.
export const Restore = value => ({
  type: 'Restore',
  value
});

// Restore recipes in-memory from PouchDB
const RestoreRecipes = {type: 'RestoreRecipes'};

// Response from recipe restore
const RestoredRecipes = result => ({
  type: 'RestoredRecipes',
  result
});

const Put = Database.Put;
const Putted = Database.Putted;

// Request database sync
const Sync = {type: 'Sync'};
// Confirm sync.
const Synced = Database.Synced;

export const Open = TagModal(Modal.Open);
export const Close = TagModal(Modal.Close);

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
const NoOp = Indexed.NoOp;

// Model, update and init

export const init = () => {
  const [recipesForm, recipesFormFx] = RecipesForm.init();
  const [banner, bannerFx] = Banner.init();

  return [
    {
      active: null,
      activePanel: null,
      isOpen: false,
      // Origin url
      origin: null,
      // Build an array of ordered recipe IDs
      order: [],
      // Index all recipes by ID
      entries: {},
      recipesForm,
      banner
    },
    Effects.batch([
      recipesFormFx.map(RecipesFormAction),
      bannerFx.map(TagBanner)
    ])
  ];
};

const updateModal = cursor({
  update: Modal.update,
  tag: TagModal
});

const updateBanner = cursor({
  get: model => model.banner,
  set: (model, banner) => merge(model, {banner}),
  update: Banner.update,
  tag: TagBanner
})

const updateRecipesForm = cursor({
  get: model => model.recipesForm,
  set: (model, recipesForm) => merge(model, {recipesForm}),
  update: RecipesForm.update,
  tag: RecipesFormAction
});

const updateByID = (model, id, action) =>
  Indexed.updateWithID(Recipe.update, byID(id), model, id, action);

const sync = model => {
  if (model.origin) {
    const origin = templateRecipesDatabase(model.origin);
    return [model, Database.sync(DB, origin).map(Synced)];
  }
  else {
    // @TODO perhaps we want to notify the user something went wrong?
    console.warn('Recipe database sync attempted before origin was added to model');
    return [model, Effects.none];
  }
}

const syncedOk = model =>
  update(model, RestoreRecipes);

// @TODO do something with sync errors.
const syncedError = model =>
  update(model, NoOp);

const restoredRecipes = Result.updater(
  (model, recipes) => [
    merge(model, {
      // Build an array of ordered recipe IDs
      order: recipes.map(getPouchID),
      // Index all recipes by ID
      entries: Indexed.indexWith(recipes, getPouchID)
    }),
    Effects.none
  ],
  // @TODO handle error case with an error banner or something.
  (model, error) => [model, Effects.none]
);

// Activate recipe by id
const activateByID = (model, id) => [
  merge(model, {active: id}),
  Effects.receive(Activated(merge({}, model.entries[id])))
];

const activatePanel = (model, id) =>
  [merge(model, {activePanel: id}), Effects.none];

const put = (model, recipe) => {
  // Insert recipe into in-memory model.
  // @TODO perhaps we should do this after succesful put.
  const next = Indexed.add(model, recipe._id, recipe);
  // Then attempt to store it in DB.
  return [next, Database.put(DB, recipe).map(Putted)];
}

const putted = (model, result) =>
  result.isOk ?
  [model, Effects.none] :
  // @TODO retry or display a banner
  update(model, FailRecipeStart);

const restore = (model, record) => {
  const next = merge(model, {origin: record.origin});

  return batch(update, next, [
    RestoreRecipes,
    Sync
  ]);
}

export const update = (model, action) =>
  action.type === 'Banner' ?
  updateBanner(model, action.source) :
  action.type === 'RecipesForm' ?
  updateRecipesForm(model, action.source) :
  action.type === 'Modal' ?
  updateModal(model, action.source) :
  action.type === 'NoOp' ?
  [model, Effects.none] :
  action.type === 'Put' ?
  put(model, action.value) :
  action.type === 'Putted' ?
  putted(model, action.result) :
  action.type === 'RestoreRecipes' ?
  [model, Database.restore(DB).map(RestoredRecipes)] :
  action.type === 'RestoredRecipes' ?
  restoredRecipes(model, action.result) :
  action.type === 'ActivateByID' ?
  activateByID(model, action.id) :
  action.type === 'ActivatePanel' ?
  activatePanel(model, action.id) :
  action.type === 'Sync' ?
  sync(model) :
  action.type === 'Synced' ?
  (
    action.result.isOk ?
    syncedOk(model) :
    syncedError(model)
  ) :
  action.type === 'Recipe' ?
  updateByID(model, action.id, action.source) :
  action.type === 'Restore' ?
  restore(model, action.value) :
  Unknown.update(model, action);

// View

export const view = (model, address) =>
  html.div({
    id: 'recipes-modal',
    className: 'modal',
    hidden: toggle(!model.isOpen, 'hidden')
  }, [
    html.div({
      className: 'modal-overlay',
      onClick: () => address(Close)
    }),
    html.dialog({
      className: classed({
        'modal-main': true
      }),
      open: toggle(model.isOpen, 'open')
    }, [
      html.div({
        className: classed({
          'panels--main': true,
          'panels--lv1': model.activePanel !== null
        })
      }, [
        html.div({
          className: 'panel--main panel--lv0'
        }, [
          html.header({
            className: 'panel--header'
          }, [
            html.h1({
              className: 'panel--title'
            }, [
              localize('Recipes')
            ]),
            html.div({
              className: 'panel--nav-right'
            }, [
              html.a({
                className: 'recipes-create-icon',
                onClick: () => address(ActivatePanel('form'))
              })
            ])
          ]),
          thunk(
            'recipes-banner',
            Banner.view,
            model.banner,
            forward(address, TagBanner),
            'panel--banner recipes--banner'
          ),
          html.div({
            className: 'panel--content'
          }, [
            html.div({
              className: classed({
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
    ])
  ]);

// Helpers

const templateRecipesDatabase = origin =>
  Template.render(Config.recipes.origin, {
    origin_url: origin
  });