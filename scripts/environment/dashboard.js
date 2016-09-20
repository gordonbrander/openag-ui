/*
The dashboard displays the latest camera information from the Food Computer.
*/
import {html, forward, Effects, thunk} from 'reflex';
import {environmental_data_point as ENVIRONMENTAL_DATA_POINT} from '../../openag-config';
import {compose} from '../lang/functional';
import {render as renderTemplate} from '../common/stache';
import {update as updateUnknown} from '../common/unknown';
import {localize} from '../common/lang';
import * as Sidebar from './dashboard/sidebar';

// Actions

const RequestOpenRecipes = {
  type: 'RequestOpenRecipes'
};

// Signal that the component has finished loading.
// This can be used by the parent component to tell the dashboard that an update
// will not be coming.
export const FinishLoading = {type: 'FinishLoading'};

export const SetRecipe = (id, name) => ({
  type: 'SetRecipe',
  id,
  name
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

const SetSidebarRecipe = compose(SidebarAction, Sidebar.SetRecipe);
export const SetAirTemperature = compose(SidebarAction, Sidebar.SetAirTemperature);

// Init and update

class Model {
  constructor(
    origin,
    recipeStartID,
    isLoading,
    sidebar
  ) {
    this.origin = origin;
    this.recipeStartID = recipeStartID;
    // We have to deal with 3 states:
    //
    // 1. Loading (waiting for data to come back). Show a spinner.
    // 2. Loaded, but no recipe start exists.
    // 3. Loaded recipe start, but no video attached.
    this.isLoading = isLoading;
    this.sidebar = sidebar;
  }
}

export const init = () => {
  const [sidebar, sidebarFx] = Sidebar.init();

  return [
    new Model(
      null,
      null,
      true,
      sidebar
    ),
    Effects.none
  ];
}

export const update = (model, action) =>
  action.type === 'Sidebar' ?
  delegateSidebarUpdate(model, action.source) :
  action.type === 'SetRecipe' ?
  setRecipe(model, action.id, action.name) :
  action.type === 'Configure' ?
  configure(model, action.origin) :
  action.type === 'FinishLoading' ?
  finishLoading(model) :
  updateUnknown(model, action);

const setRecipe = (model, id, name) => {
  // Update sidebar model with id and name
  const [sidebar, sidebarFx] = Sidebar.update(
    model.sidebar,
    Sidebar.SetRecipe(id, name)
  );

  // Create new model with id and new sidebar model
  const next = new Model(
    model.origin,
    id,
    // Set isLoading to false
    false,
    sidebar
  );

  // return next model and make sure to map sidebarFx.
  return [next, sidebarFx.map(TagSidebar)];
}

// Configure origin url on model
const configure = (model, origin) => [
  new Model(
    origin,
    model.recipeStartID,
    model.isLoading,
    model.sidebar
  ),
  Effects.none
];

// Flag initial loading state as finished.
const finishLoading = model => [
  new Model(
    model.origin,
    model.recipeStartID,
    false,
    model.sidebar
  ),
  Effects.none
];

const swapSidebar = (model, [sidebar, fx]) => [
  new Model(
    model.origin,
    model.recipeStartID,
    model.isLoading,
    sidebar
  ),
  fx.map(TagSidebar)
];

const delegateSidebarUpdate = (model, action) =>
  swapSidebar(model, Sidebar.update(model.sidebar, action));

// View

export const view = (model, address) =>
  model.isLoading ?
  viewLoading(model, address) :
  !isReady(model) ?
  viewEmpty(model, address) :
  viewReady(model, address);

const viewReady = (model, address) =>
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

const viewLoading = (model, address) =>
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
      className: 'dashboard-content split-view-content split-view-content--loading'
    }, [
    ])
  ]);

const viewEmpty = (model, address) =>
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
        className: 'dashboard-camera-plug'
      }, [
        html.img({
          src: 'assets/camera.svg',
          className: 'dashboard-camera-plug--icon'
        }),
        html.span({}, [
          localize('No camera data yet')
        ])
      ])
    ])
  ]);

// Utils

const isReady = model => (
  model.origin != null &&
  model.recipeStartID != null
);

const templateVideoUrl = model =>
  renderTemplate(ENVIRONMENTAL_DATA_POINT.timelapse, {
    origin_url: model.origin,
    recipe_start_id: model.recipeStartID
  });