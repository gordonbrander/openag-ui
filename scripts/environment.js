import * as Config from '../openag-config.json';
import {html, forward, Effects, Task, thunk} from 'reflex';
import {merge, tagged, tag, batch} from './common/prelude';
import {toggle} from './common/attr';
import * as Template from './common/stache';
import * as Request from './common/request';
import * as Result from './common/result';
import * as Unknown from './common/unknown';
import {cursor} from './common/cursor';
import {constant, compose} from './lang/functional';
import {findRunningRecipe, findAirTemperature} from './environment/doc';
import * as Chart from './environment/chart';
import * as Dashboard from './environment/dashboard';
import * as Controls from './environment/controls';

// State keys
const DASHBOARD = 'dashboard';
const CHART = 'chart';
const CONTROLS = 'controls';

// Time constants in ms
const S_MS = 1000;
const MIN_MS = S_MS * 60;
const HR_MS = MIN_MS * 60;
const DAY_MS = HR_MS * 24;
const RETRY_TIMEOUT = 4 * S_MS;

// Limit to the number of datapoints that will be rendered in chart.
const MAX_DATAPOINTS = 5000;

// Actions

const NoOp = {
  type: 'NoOp'
};

const RequestOpenRecipes = {
  type: 'RequestOpenRecipes'
};

export const ActivateState = id => ({
  type: 'ActivateState',
  id
});

// Configure action received from parent.
export const Configure = (environmentID, environmentName, api, origin) => ({
  type: 'Configure',
  api,
  origin,
  id: environmentID,
  name: environmentName
});

// Set a recipe. This action is generally called "from above" by app after
// starting a recipe via the UI.
export const SetRecipe = (id, name) => ({
  type: 'SetRecipe',
  id,
  name
});

const TagChart = action =>
  action.type === 'RequestOpenRecipes' ?
  RequestOpenRecipes :
  ChartAction(action);

const ChartAction = action => ({
  type: 'Chart',
  source: action
});

const AddChartData = compose(ChartAction, Chart.AddData);
const SetChartRecipe = compose(ChartAction, Chart.SetRecipe);
const ConfigureChart = compose(ChartAction, Chart.Configure);

const TagDashboard = action =>
  action.type === 'RequestOpenRecipes' ?
  RequestOpenRecipes :
  DashboardAction(action);

const DashboardAction = action => ({
  type: 'Dashboard',
  source: action
});

const ConfigureDashboard = compose(DashboardAction, Dashboard.Configure);
const SetDashboardRecipe = compose(DashboardAction, Dashboard.SetRecipe);
const decodeDashboardRecipe = compose(DashboardAction, Dashboard.decodeRecipe);
const FinishDashboardLoading = DashboardAction(Dashboard.FinishLoading);
const SetDashboardAirTemperature = compose(DashboardAction, Dashboard.SetAirTemperature);

const TagControls = action => ({
  type: 'Controls',
  source: action
});

const ConfigureControls = compose(TagControls, Controls.Configure);

const GetChanges = {type: 'GetChanges'};

const GotChanges = result => ({
  type: 'GotChanges',
  result
});

// Action for fetching chart backlog.
const GetBacklog = {type: 'GetBacklog'};

// Action for the result of fetching chart backlog.
const GotBacklog = result => ({
  type: 'GotBacklog',
  result
});

// Send an alert. We use this to send up problems to be displayed in banner.
const AlertBanner = tag('AlertBanner');

// Model init and update

export const init = (id, state) => {
  const [dashboard, dashboardFx] = Dashboard.init();
  const [chart, chartFx] = Chart.init(id);
  const [controls, controlsFx] = Controls.init();

  return [
    {
      id,
      name: null,
      state,
      chart,
      dashboard,
      controls
    },
    Effects.batch([
      chartFx.map(TagChart),
      dashboardFx.map(TagDashboard),
      controlsFx.map(TagControls)
    ])
  ];
};

// Serialize environment for storing locally.
export const serialize = model => ({
  id: model.id,
  name: model.name
});

export const update = (model, action) =>
  action.type === 'NoOp' ?
  [model, Effects.none] :
  action.type === 'Chart' ?
  updateChart(model, action.source) :
  action.type === 'Dashboard' ?
  updateDashboard(model, action.source) :
  action.type === 'Controls' ?
  updateControls(model, action.source) :
  action.type === 'GetChanges' ?
  getChanges(model) :
  action.type === 'GotChanges' ?
  (
    action.result.isOk ?
    gotChangesOk(model, action.result.value) :
    gotChangesError(model, action.result.error)
  ) :
  action.type === 'SetRecipe' ?
  setRecipe(model, action.id, action.name) :
  action.type === 'GetBacklog' ?
  getBacklog(model) :
  action.type === 'GotBacklog' ?
  updateBacklog(model, action.result) :
  action.type === 'ActivateState' ?
  activateState(model, action.id) :
  action.type === 'Configure' ?
  configure(model, action) :
  Unknown.update(model, action);

const getBacklog = model => {
  if (model.origin != null && model.id) {
    const url = templateRecentUrl(model.origin, model.id);
    return [model, Request.get(url).map(GotBacklog)];
  }
  else {
    console.warn('GetBacklog was requested before origin and ID were restored on model');
    return [model, Effects.none];
  }
}

// Update chart backlog from result of fetch.
const updateBacklog = Result.updater(
  (model, record) => {
    const data = readData(record);

    const actions = [
      // This will also automatically handle setting any new RecipeStart
      AddChartData(data)
    ];

    // Find the most recent recipe start.
    const recipeStart = findRunningRecipe(data);
    // If we found one, send it to dashboard so it can display timelapse video.
    if (recipeStart) {
      actions.push(decodeDashboardRecipe(recipeStart));
    }
    // If we didn't, let dashboard know it can stop showing the loading spinner.
    else {
      actions.push(FinishDashboardLoading);
    }

    // find air temperature
    const airTemperature = findAirTemperature(data);
    if (airTemperature) {
      actions.push(SetDashboardAirTemperature(airTemperature));
    }

    actions.push(GetChanges);

    return batch(update, model, actions);
  },
  (model, error) => {
    const action = AlertBanner(error);

    return [
      model,
      Effects.batch([
        // Wait for a bit, then try to get backlog again.
        Effects.perform(Task.sleep(RETRY_TIMEOUT)).map(constant(GetBacklog)),
        Effects.receive(action)
      ])
    ];
  }
);

const getChanges = model => {
  if (model.changesUrl) {
    return [model, Request.get(model.changesUrl).map(GotChanges)];
  }
  else {
    // This case should never happen. Handle it anyway and warn developer.
    console.warn('GetChanges was sent before changesUrl was configured on environment model. This should never happen.');
    return [model, Effects.none];
  }
}

const gotChangesOk = (model, record) => {
  const data = readChanges(record);

  const actions = [
    // This will also handle adding any recipe start
    AddChartData(data)
  ];

  // Find the most recent recipe start.
  const recipeStart = findRunningRecipe(data);
  if (recipeStart) {
    // If we found one, send it to dashboard so it can display timelapse video.
    actions.push(decodeDashboardRecipe(recipeStart));
  }
  // If we didn't, let dashboard know it can stop showing the loading spinner.
  else {
    actions.push(FinishDashboardLoading);
  }

  // find air temperature
  const airTemperature = findAirTemperature(data);
  if (airTemperature) {
    actions.push(SetDashboardAirTemperature(airTemperature));
  }

  actions.push(GetChanges);

  return batch(update, model, actions);
}

const gotChangesError = (model, error) => {
  // Create alert action
  const action = AlertBanner(error);

  return [
    model,
    Effects.receive(action)
  ];
}

const configure = (model, {api, origin, id, name}) => {
  const next = merge(model, {
    origin,
    id,
    name,
    // Template and save changes URL for future use.
    changesUrl: templateChangesUrl(origin)
  });

  return batch(update, next, [
    // Forward configuration down to submodules.
    ConfigureChart(origin),
    ConfigureDashboard(origin),
    ConfigureControls(api, id),
    // Now that we have the origin, get the backlog.
    GetBacklog
  ]);
}

const activateState = (model, id) => [
  merge(model, {state: id}),
  Effects.none
];

const setRecipe = (model, id, name) => {
  const hasTimelapseAttachment = false;

  return batch(update, model, [
    SetChartRecipe(id, name),
    // This action comes "from above" when activating a recipe in the UI, before
    // we get an http response. That means we don't yet have a timelapse
    // attachment to show.
    SetDashboardRecipe(id, name, hasTimelapseAttachment)
  ]);
}

const updateChart = cursor({
  get: model => model.chart,
  set: (model, chart) => merge(model, {chart}),
  update: Chart.update,
  tag: TagChart
});

const updateDashboard = cursor({
  get: model => model.dashboard,
  set: (model, dashboard) => merge(model, {dashboard}),
  update: Dashboard.update,
  tag: TagDashboard
});

const updateControls = cursor({
  get: model => model.controls,
  set: (model, controls) => merge(model, {controls}),
  update: Controls.update,
  tag: TagControls
});

// View

export const view = (model, address) =>
  html.div({
    className: 'environment'
  }, [
    html.div({
      className: 'environment-view',
      hidden: toggle(model.state !== DASHBOARD, 'hidden')
    }, [
      thunk(
        'environment-dashboard',
        Dashboard.view,
        model.dashboard,
        forward(address, TagDashboard)
      )
    ]),
    html.div({
      className: 'environment-view',
      hidden: toggle(model.state !== CHART, 'hidden')
    }, [
      thunk(
        'environment-chart',
        Chart.view,
        model.chart,
        forward(address, TagChart)
      )
    ]),
    html.div({
      className: 'environment-view',
      hidden: toggle(model.state !== CONTROLS, 'hidden')
    }, [
      thunk(
        'environment-controls',
        Controls.view,
        model.controls,
        forward(address, TagControls)
      )
    ])
  ]);

// Helpers

const readRow = row => row.value;
// @FIXME must check that the value returned from http call is JSON and has
// this structure before mapping.
const readRecord = record => record.rows.map(readRow);

const readData = record => {
  const data = readRecord(record);
  if (data.length > 0) {
    data.sort(compareByTimestamp);
  }
  return data;
};

const compareByTimestamp = (a, b) =>
  a.timestamp > b.timestamp ? 1 : -1;

// `_changes` API responses are shaped like:
//
//     {
//       "results": [
//         {
//           "seq":3,
//           "id":"1471638075.99-36421882",
//           "changes":[
//             {"rev":"1-3ecb9485ad6906af287e040bd2fb9a2a"}
//           ],
//           "doc":{
//             "_id":"1471638075.99-36421882",
//             "_rev":"1-3ecb9485ad6906af287e040bd2fb9a2a",
//             "timestamp":1471638075.9857180119,
//             "value":0.045910000801086425781,
//             "environment":"environment_1",
//             "is_manual":false,
//             "variable":"water_electrical_conductivity",
//             "is_desired":false
//           }
//         },
//         ...
//       ]
//     }
//
const readChanges = record => record.results.map(readDoc);

// Read doc from results row.
const readDoc = result => result.doc;

// Create a url string that allows you to GET latest environmental datapoints
// from an environmen via CouchDB.
const templateLatestUrl = (origin, id) =>
  Template.render(Config.environmental_data_point.origin_latest, {
    origin_url: origin,
    startkey: JSON.stringify([id]),
    endkey: JSON.stringify([id, {}])
  });

const templateRecentUrl = (origin, id) =>
  Template.render(Config.environmental_data_point.origin_range, {
    origin_url: origin,
    startkey: JSON.stringify([id, {}]),
    endkey: JSON.stringify([id]),
    limit: MAX_DATAPOINTS,
    descending: true
  });

const templateChangesUrl = origin =>
  Template.render(Config.environmental_data_point.changes, {
    origin_url: origin
  });