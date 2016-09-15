import {html, forward, Effects, Task, thunk} from 'reflex';
import {merge, batch, tagged} from '../../common/prelude';
import {localize} from '../../common/lang';
import {cursor} from '../../common/cursor';
import {compose} from '../../lang/functional';
import {update as updateUnknown} from '../../common/unknown';
import * as Recipe from '../sidebar/recipe';
import * as AirTemperature from '../sidebar/air-temperature';

// Actions

// Request that the recipes view be opened.
const RequestOpenRecipes = {
  type: 'RequestOpenRecipes'
};

export const TagAirTemperature = action => ({
  type: 'AirTemperature',
  source: action
});

export const SetAirTemperature = compose(TagAirTemperature, AirTemperature.SetValue);

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
  const [airTemperature, airTemperatureFx] = AirTemperature.init(null);

  return [
    {
      recipe,
      airTemperature
    },
    Effects.batch([
      recipeFx.map(TagRecipe),
      airTemperatureFx.map(TagAirTemperature)
    ])
  ];
}

export const update = (model, action) =>
  action.type === 'Recipe' ?
  updateRecipe(model, action.source) :
  action.type === 'AirTemperature' ?
  updateAirTemperature(model, action.source) :
  updateUnknown(model, action);

const updateRecipe = cursor({
  get: model => model.recipe,
  set: (model, recipe) => merge(model, {recipe}),
  update: Recipe.update,
  tag: TagRecipe
});

const updateAirTemperature = cursor({
  get: model => model.airTemperature,
  set: (model, airTemperature) => merge(model, {airTemperature}),
  update: AirTemperature.update,
  tag: TagAirTemperature
});

// View

export const view = (model, address) =>
  html.aside({
    className: 'sidebar-summary split-view-sidebar'
  }, [
    html.div({
      className: 'sidebar-summary--in'
    }, [
      html.div({
        className: 'sidebar-summary--unit'
      }, [
        thunk(
          'sidebar-recipe',
          Recipe.view,
          model.recipe,
          forward(address, TagRecipe)
        )
      ]),
      html.div({
        className: 'sidebar-summary--unit'
      }, [
        thunk(
          'chart-sidebar-air-temperature',
          AirTemperature.view,
          model.airTemperature,
          forward(address, TagAirTemperature)
        )
      ])
    ])
  ]);
