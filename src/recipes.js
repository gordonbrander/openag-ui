import {html, forward, Effects, Task} from 'reflex';
import * as Config from '../openag-config.json';
import PouchDB from 'pouchdb';
import {indexWith, getter} from './common/indexed';
import * as Unknown from './common/unknown';
import {merge} from './common/prelude';
import {compose} from './lang/functional';
import * as Recipe from './recipe';

const DB = new PouchDB(Config.db_local_recipes);
// Export for debugging
window.RecipesDB = DB;

export const RequestPut = recipe => ({
  type: 'RequestPut',
  recipe
});

export const RespondPut = response => ({
  type: 'RespondPut',
  response
});

export const FailPut = error => ({
  type: 'FailPut',
  error
});

// Get data from DB as an effect.
export const putRecipe = recipe =>
  Effects.task(new Task((succeed, fail) => {
    DB.put(recipe)
    .then(
      compose(succeed, RespondPut),
      compose(fail, FailPut)
    );
  }));

// Create getter function for recipe ID.
const getID = getter('_id');

export const init = recipes =>
  [
    {
      // Index all recipes by ID
      entries: indexWith(recipes, getID, Recipe.init)
    },
    Effects.none
  ];

export const update = (model, action) =>
  action.type === 'RequestPut' ?
  [
    merge(model, {
      entries: merge(model.entries, {
        [action.recipe._id]: action.recipe
      })
    }),
    putRecipe(action.recipe)
  ] :
  Unknown.update(model, action);
