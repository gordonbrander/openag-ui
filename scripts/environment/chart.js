/*
This file implements the chart view for the environment. The chart view is made
up of the chart widget, a sidebar, an exporter and other things.

If you're looking for the chart widget which is embedded in this view, check out
`chart/chart.js`.
*/
import {html, forward, Effects, Task, thunk} from 'reflex';
import {merge, tagged, tag, batch} from '../common/prelude';
import {cursor} from '../common/cursor';
import {update as updateUnknown} from '../common/unknown';
import {compose} from '../lang/functional';
import {findRunningRecipe, findAirTemperature} from './datapoints';

// Import Chart d3 widget
import * as Chart from './chart/chart';
import * as Sidebar from './chart/sidebar';

// Import shared environment widgets
import * as Toolbox from '../environment/toolbox';
import * as Exporter from '../environment/exporter';

// Action and tagging functions

const RequestOpenRecipes = {
  type: 'RequestOpenRecipes'
};

const TagExporter = tag('Exporter');
const OpenExporter = TagExporter(Exporter.Open);
export const Configure = compose(TagExporter, Exporter.Configure);

export const AddData = value => ({
  type: 'AddData',
  value
});

const TagSidebar = action =>
  action.type === 'RequestOpenRecipes' ?
  RequestOpenRecipes :
  action.type === 'DropMarker' ?
  DropMarker :
  tagged('Sidebar', action);

const SetRecipe = compose(TagSidebar, Sidebar.SetRecipe);
const SetAirTemperature = compose(TagSidebar, Sidebar.SetAirTemperature);

const TagToolbox = action =>
  action.type === 'OpenExporter' ?
  OpenExporter :
  tagged('Toolbox', action);

const TagChart = action =>
  tagged('Chart', action);

const AddChartData = compose(TagChart, Chart.AddData);

const ChartLoading = compose(TagChart, Chart.Loading);
// Drop a marker (in the chart)
const DropMarker = TagChart(Chart.DropMarker);

// Init and Update

export const init = (id) => {
  const [chart, chartFx] = Chart.init();
  const [exporter, exporterFx] = Exporter.init();
  const [sidebar, sidebarFx] = Sidebar.init();

  return [
    {
      id,
      chart,
      exporter,
      sidebar
    },
    Effects.batch([
      chartFx.map(TagChart),
      exporterFx.map(TagExporter),
      sidebarFx.map(TagSidebar)
    ])
  ];
}

export const update = (model, action) =>
  action.type === 'Exporter' ?
  updateExporter(model, action.source) :
  action.type === 'Chart' ?
  updateChart(model, action.source) :
  action.type === 'Sidebar' ?
  updateSidebar(model, action.source) :
  action.type === 'AddData' ?
  addData(model, action.value) :
  updateUnknown(model, action);

const updateSidebar = cursor({
  get: model => model.sidebar,
  set: (model, sidebar) => merge(model, {sidebar}),
  update: Sidebar.update,
  tag: TagSidebar
});

const updateExporter = cursor({
  get: model => model.exporter,
  set: (model, exporter) => merge(model, {exporter}),
  update: Exporter.update,
  tag: TagExporter
});

const updateChart = cursor({
  get: model => model.chart,
  set: (model, chart) => merge(model, {chart}),
  update: Chart.update,
  tag: TagChart
});

const addData = (model, data) => {
  const actions = [
    AddChartData(data)
  ];

  // find air temperature
  const airTemperature = findAirTemperature(data);
  if (airTemperature) {
    actions.push(SetAirTemperature(airTemperature));
  }

  const recipeStart = findRunningRecipe(data);
  if (recipeStart) {
    actions.push(SetRecipe(recipeStart));
  }

  return batch(update, model, actions);
}

// View

export const view = (model, address) =>
  model.id ?
  viewReady(model, address) :
  viewUnready(model, address);

const viewReady = (model, address) =>
  html.div({
    className: 'chart-view split-view'
  }, [
    thunk(
      'chart',
      Chart.view,
      model.chart,
      forward(address, TagChart)
    ),
    thunk(
      'sidebar',
      Sidebar.view,
      model.sidebar,
      forward(address, TagSidebar)
    ),
    thunk('chart-toolbox', Toolbox.view, model, forward(address, TagToolbox)),
    thunk(
      'chart-export',
      Exporter.view,
      model.exporter,
      forward(address, TagExporter),
      model.id
    )
  ]);

const viewUnready = (model, address) =>
  html.div({
    className: 'chart-view split-view'
  }, [
    thunk(
      'sidebar',
      Sidebar.view,
      model.sidebar,
      forward(address, TagSidebar)
    ),
    html.div({
      className: 'chart-view-content chart-view-content--loading split-view-content'
    })
  ]);