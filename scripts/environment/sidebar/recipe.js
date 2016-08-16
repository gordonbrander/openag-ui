import {html, forward, Effects, Task, thunk} from 'reflex';
import {merge} from '../../common/prelude';
import {localize} from '../../common/lang';
import {update as updateUnknown} from '../../common/unknown';

// Actions

export const RequestOpenRecipes = {
  type: 'RequestOpenRecipes'
};

// Set the recipe
export const SetRecipe = recipe => ({
  type: 'SetRecipe',
  recipe
});

// Model, init, update

// Empty model that we can re-use.
const Empty = Object.freeze({
  id: null,
  name: null
});

export const init = () => [
  // Initialize in empty state
  Empty,
  Effects.none
];

export const update = (model, action) =>
  action.type === 'SetRecipe' ?
  setRecipe(model, action.recipe) :
  updateUnknown(model, action);

const setRecipe = (model, recipe) => [
  merge(model, {
    id: recipe._id,
    // @TODO recipes don't currently have a name. When they do, put it here.
    name: (recipe.name || recipe._id)
  }),
  Effects.none
];

// View

export const view = (model, address) =>
  html.div({
    className: 'current-recipe'
  }, [
    html.div({
      className: 'current-recipe--label'
    }, [
      localize('Recipe')
    ]),
    html.a({
      className: 'current-recipe--name',
      onClick: event => {
        event.preventDefault();
        address(RequestOpenRecipes)
      }
    }, [
      readName(model)
    ])
  ])

// Read name from model, or use fallback.
const readName = model =>
  model.name ? model.name : localize('None');
