/*
The dashboard displays the latest camera information from the Food Computer.
*/
import {html, forward, Effects, thunk} from 'reflex';
import {environmental_data_point as ENVIRONMENTAL_DATA_POINT} from '../../openag-config';
import {merge} from '../common/prelude';
import {render as renderTemplate} from '../common/stache';
import {update as updateUnknown} from '../common/unknown';

const TIMELAPSE_TEMPLATE = ENVIRONMENTAL_DATA_POINT.timelapse;

// Actions

export const SetRecipeStartID = id => ({
  type: 'SetRecipeStartID',
  id
});

export const Configure = origin => ({
  type: 'Configure',
  origin
});

// Init and update

class Model {
  constructor(
    origin,
    recipeStartID
  ) {
    this.origin = origin;
    this.recipeStartID = recipeStartID;
  }
}

export const init = () => [
  new Model(null, null),
  Effects.none
];

export const update = (model, action) =>
  action.type === 'SetRecipeStartID' ?
  setRecipeStartID(model, action.id) :
  action.type === 'Configure' ?
  configure(model, action.origin) :
  updateUnknown(model, action);

const setRecipeStartID = (model, recipeStartID) => [
  new Model(model.origin, recipeStartID),
  Effects.none
];

const configure = (model, origin) => [
  new Model(origin, model.recipeStartID),
  Effects.none
];

// View

export const view = (model, address) =>
  isReady(model) ?
  viewReady(model, address) :
  viewUnready(model, address);

export const viewReady = (model, address) =>
  html.div({
    className: 'dashboard-view split-view'
  }, [
    html.div({
      className: 'dashboard-content split-view-content'
    }, [
      html.video({
        className: 'dashboard-video',
        src: templateVideoUrl(model),
        autoplay: true,
        loop: true
      })
    ])
  ]);

export const viewUnready = (model, address) =>
  html.div({
    className: 'dashboard-view split-view'
  }, [
    'Waiting for configuration'
  ]);

// Utils

const isReady = model => (
  model.origin != null &&
  model.recipeStartID != null
);

const templateVideoUrl = model =>
  renderTemplate(TIMELAPSE_TEMPLATE, {
    origin_url: model.origin,
    recipe_start_id: model.recipeStartID
  });