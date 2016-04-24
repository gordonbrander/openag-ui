import {html, forward, Effects, Task} from 'reflex';
import * as Config from '../openag-config.json';
import PouchDB from 'pouchdb';
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

const indexWith = (array, key, map) => {
  const index = {};
  for (let object of array) {
    index[object[key]] = map(object);
  }
  return index;
}

export const init = recipes =>
  [
    {
      entries: indexWith(recipes, '_id', Recipe.init)
    },
    Effects.none
  ];

export const update = (model, action) =>
  action.type === 'RequestPut' ?
  [
    merge(model, {
      [action.recipe._id]: action.recipe
    }),
    putRecipe(action.recipe)
  ] :
  Unknown.update(model, action);
