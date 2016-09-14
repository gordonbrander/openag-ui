import {html, forward, Effects, Task, thunk} from 'reflex';
import {merge, batch, tagged} from '../../common/prelude';
import {localize} from '../../common/lang';
import * as Button from '../../common/button';
import {cursor} from '../../common/cursor';
import {compose} from '../../lang/functional';
import {update as updateUnknown} from '../../common/unknown';
import * as Recipe from '../sidebar/recipe';

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

  return [
    {
      recipe,
      markerButton,
      airTemperature: null
    },
    Effects.batch([
      recipeFx.map(TagRecipe),
      markerButtonFx.map(TagMarkerButton)
    ])
  ];
}

export const update = (model, action) =>
  action.type === 'Recipe' ?
  updateRecipe(model, action.source) :
  action.type === 'MarkerButton' ?
  updateMarkerButton(model, action.source) :
  action.type === 'SetAirTemperature' ?
  setAirTemperature(model, action.value) :
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
          'sidebar-air-temperature',
          viewAirTemperature,
          model.airTemperature
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