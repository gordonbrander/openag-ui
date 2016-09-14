/*
The dashboard displays the latest camera information from the Food Computer.
*/
import {html, forward, Effects, thunk} from 'reflex';
import {environmental_data_point as ENVIRONMENTAL_DATA_POINT} from '../../openag-config';
import {compose} from '../lang/functional';
import {render as renderTemplate} from '../common/stache';
import {update as updateUnknown} from '../common/unknown';
import * as Sidebar from './dashboard/sidebar';

const TIMELAPSE_TEMPLATE = ENVIRONMENTAL_DATA_POINT.timelapse;

// Actions

const RequestOpenRecipes = {
  type: 'RequestOpenRecipes'
};

export const SetRecipeStartID = id => ({
  type: 'SetRecipeStartID',
  id
});

export const Configure = origin => ({
  type: 'Configure',
  origin
});

export const TagSidebar = action =>
  action.type === 'RequestOpenRecipes' ?
  RequestOpenRecipes :
  SidebarAction(action);

const SidebarAction = action => ({
  type: 'Sidebar',
  source: action
});

const SetRecipe = compose(SidebarAction, Sidebar.SetRecipe);
export const SetAirTemperature = compose(SidebarAction, Sidebar.SetAirTemperature);

// Init and update

class Model {
  constructor(
    origin,
    recipeStartID,
    sidebar
  ) {
    this.origin = origin;
    this.recipeStartID = recipeStartID;
    this.sidebar = sidebar;
  }
}

export const init = () => {
  const [sidebar, sidebarFx] = Sidebar.init();

  return [
    new Model(
      null,
      null,
      sidebar
    ),
    Effects.none
  ];
}

export const update = (model, action) =>
  action.type === 'Sidebar' ?
  delegateSidebarUpdate(model, action.source) :
  action.type === 'SetRecipeStartID' ?
  setRecipeStartID(model, action.id) :
  action.type === 'Configure' ?
  configure(model, action.origin) :
  updateUnknown(model, action);

const setRecipeStartID = (model, recipeStartID) => [
  new Model(
    model.origin,
    recipeStartID,
    model.sidebar
  ),
  Effects.none
];

const configure = (model, origin) => [
  new Model(
    origin,
    model.recipeStartID,
    model.sidebar
  ),
  Effects.none
];

const swapSidebar = (model, [sidebar, fx]) => [
  new Model(model.origin, model.recipeStartID, sidebar),
  fx.map(TagSidebar)
];

const delegateSidebarUpdate = (model, action) =>
  swapSidebar(model, Sidebar.update(model.sidebar, action));

// View

export const view = (model, address) =>
  isReady(model) ?
  viewReady(model, address) :
  viewUnready(model, address);

export const viewReady = (model, address) =>
  html.div({
    className: 'dashboard-view split-view'
  }, [
    thunk(
      'dashboard-sidebar',
      Sidebar.view,
      model.sidebar,
      forward(address, TagSidebar)
    ),
    html.div({
      className: 'dashboard-content split-view-content'
    }, [
      html.div({
        className: 'timelapse--mask'
      }, [
        html.video({
          className: 'timelapse--video',
          src: templateVideoUrl(model),
          autoplay: true,
          preload: 'auto',
          loop: true,
          muted: true
        })
      ])
    ])
  ]);

export const viewUnready = (model, address) =>
  html.div({
    className: 'dashboard-view split-view'
  }, [
    thunk(
      'dashboard-sidebar',
      Sidebar.view,
      model.sidebar,
      forward(address, TagSidebar)
    ),
    html.div({
      className: 'dashboard-content split-view-content'
    }, [
    ])
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