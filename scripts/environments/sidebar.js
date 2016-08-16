import {html, forward, Effects, Task, thunk} from 'reflex';
import {merge, batch, tagged} from '../common/prelude';
import {cursor} from '../common/cursor';
import {compose} from '../lang/functional';
import {update as updateUnknown} from '../common/unknown';
import * as Recipe from './sidebar/recipe';

// Actions

// Request that the recipes view be opened.
const RequestOpenRecipes = {
  type: 'RequestOpenRecipes'
};

// Set air temperature in sidebar
export const SetAirTemperature = value => ({
  type: 'SetAirTemperature',
  value
});

// Tag sidebar recipe actions so we can forward them down.
export const TagRecipe = action =>
  action.type === 'RequestOpenRecipes' ?
  RequestOpenRecipes :
  tagged('Recipe', action);

// Set recipe on Recipe submodule.
export const SetRecipe = compose(TagRecipe, Recipe.SetRecipe);

// Model, init, update

export const init = () => {
  const [recipe, recipeFx] = Recipe.init();

  return [
    {
      recipe,
      airTemperature: null
    },
    recipeFx.map(TagRecipe)
  ];
}

export const update = (model, action) =>
  action.type === 'Recipe' ?
  updateRecipe(model, action.source) :
  action.type === 'SetAirTemperature' ?
  setAirTemperature(model, action.value) :
  updateUnknown(model, action);

const updateRecipe = cursor({
  get: model => model.recipe,
  set: (model, recipe) => merge(model, {recipe}),
  update: Recipe.update,
  tag: TagRecipe
})

const setAirTemperature = (model, airTemperature) => {
  return (
    airTemperature != null ?
    [merge(model, {airTemperature}), Effects.none] :
    [model, Effects.none]
  );
}

// View

export const view = (model, address) =>
  html.aside({
    className: 'sidebar-summary'
  }, [
    html.div({
      className: 'sidebar-summary--in'
    }, [
      thunk(
        'sidebar-recipe',
        Recipe.view,
        model.recipe,
        forward(address, TagRecipe)
      ),
      viewAirTemperature(model.airTemperature)
    ])
  ]);

const UNIT = '\u00B0';

const viewAirTemperature = airTemperature => {
  if (airTemperature == null) {
    return html.div({
      className: 'env-temperature env-temperature--large'
    }, ['-']);
  }
  else {
    return html.div({
      className: 'env-temperature env-temperature--large'
    }, [
      readTemperature(airTemperature),
      html.span({
        className: 'env-temperature--unit'
      }, [UNIT])
    ]);
  }
}

const readTemperature = value =>
  (Math.round(value) + '');