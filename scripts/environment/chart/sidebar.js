import {html, forward, Effects, Task, thunk} from 'reflex';
import {merge, batch, tagged} from '../../common/prelude';
import {localize} from '../../common/lang';
import * as Button from '../../common/button';
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

// Drop a marker (in the chart)
const DropMarker = {type: 'DropMarker'};

export const TagMarkerButton = action =>
  action.type === 'Click' ?
  DropMarker :
  tagged('MarkerButton', action);

// Model, init, update

export const init = () => {
  const [recipe, recipeFx] = Recipe.init();
  const [markerButton, markerButtonFx] = Button.init(
    localize('Drop Marker'),
    false,
    false,
    false,
    false
  );
  const [airTemperature, airTemperatureFx] = AirTemperature.init(null);

  return [
    {
      recipe,
      markerButton,
      airTemperature
    },
    Effects.batch([
      recipeFx.map(TagRecipe),
      markerButtonFx.map(TagMarkerButton),
      airTemperatureFx.map(TagAirTemperature)
    ])
  ];
}

export const update = (model, action) =>
  action.type === 'Recipe' ?
  updateRecipe(model, action.source) :
  action.type === 'MarkerButton' ?
  updateMarkerButton(model, action.source) :
  action.type === 'AirTemperature' ?
  updateAirTemperature(model, action.source) :
  updateUnknown(model, action);

const updateRecipe = cursor({
  get: model => model.recipe,
  set: (model, recipe) => merge(model, {recipe}),
  update: Recipe.update,
  tag: TagRecipe
});

const updateMarkerButton = cursor({
  get: model => model.markerButton,
  set: (model, markerButton) => merge(model, {markerButton}),
  update: Button.update,
  tag: TagMarkerButton
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
    className: 'sidebar-summary'
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
      ]),
      html.div({
        className: 'sidebar-summary--unit'
      }, [
        thunk(
          'sidebar-marker-button',
          Button.view,
          model.markerButton,
          forward(address, TagMarkerButton),
          'btn-secondary btn-secondary--full-width'
        )
      ])
    ])
  ]);
