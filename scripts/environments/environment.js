import * as Config from '../../openag-config.json';
import {html, forward, Effects, thunk} from 'reflex';
import {merge, tagged, tag, batch} from '../common/prelude';
import * as Poll from '../common/poll';
import * as Template from '../common/stache';
import * as Request from '../common/request';
import * as Result from '../common/result';
import * as Unknown from '../common/unknown';
import {cursor} from '../common/cursor';
import {compose} from '../lang/functional';
import * as EnvironmentalDataPoint from '../environmental-data-point';
import * as Chart from '../environments/chart';
// @TODO do proper localization
import * as LANG from '../environments/lang';

const RECIPE_START = 'recipe_start';
const RECIPE_END = 'recipe_end';

const seconds = 1000;
const POLL_TIMEOUT = 2 * seconds;

// Actions

const NoOp = {
  type: 'NoOp'
};

const PollAction = action =>
  action.type === 'Ping' ?
  GetLatest :
  tagged('Poll', action);

// This is the first fetch we do for the model from the API.
const GetRestore = {type: 'GetRestore'};
const Restore = tag('Restore');

const GetLatest = {type: 'GetLatest'};
const Latest = tag('Latest');

const GetBacklog = {type: 'GetBacklog'};
const Reset = tag('Reset');

const PongPoll = PollAction(Poll.Pong);
const MissPoll = PollAction(Poll.Miss);

const ChartAction = tag('Chart');
const ChartData = compose(ChartAction, Chart.Data);

const RecipeStartAction = tag('RecipeStart');
const RecipeEndAction = tag('RecipeEnd');

// Map an incoming datapoint into an action
const DataPointAction = dataPoint =>
  dataPoint.variable === RECIPE_START ?
  AddRecipeStart(dataPoint) :
  dataPoint.variable === RECIPE_END ?
  AddRecipeEnd(dataPoint) :
  NoOp;

const AddRecipeStart = compose(
  RecipeStartAction,
  EnvironmentalDataPoint.Add
);

const AddRecipeEnd = compose(
  RecipeEndAction,
  EnvironmentalDataPoint.Add
);

// Effect
const getBacklog = model =>
  model.id && hasRecipeStart(model) ?
  Request
    .get(templateRangeUrl(model.id, model.recipeStart.value.timestamp))
    .map(Reset):
  Effects.none;

// Model init and update

export const init = id => {
  const [poll, pollFx] = Poll.init(POLL_TIMEOUT);

  const [recipeStart, recipeStartFx] = EnvironmentalDataPoint.init(
    RECIPE_START,
    ''
  );

  const [recipeEnd, recipeEndFx] = EnvironmentalDataPoint.init(
    RECIPE_END,
    ''
  );

  const [chart, chartFx] = Chart.init();

  return [
    {
      id,
      chart,
      poll,
      recipeStart,
      recipeEnd
    },
    Effects.batch([
      chartFx.map(ChartAction),
      pollFx.map(PollAction),
      recipeStartFx.map(RecipeStartAction),
      recipeEndFx.map(RecipeEndAction),
      Effects.receive(GetRestore)
    ])
  ];
};

export const update = (model, action) =>
  action.type === 'NoOp' ?
  [model, Effects.none] :
  action.type === 'Poll' ?
  updatePoll(model, action.source) :
  action.type === 'GetLatest' ?
  [model, Request.get(templateLatestUrl(model.id)).map(Latest)] :
  action.type === 'GetBacklog' ?
  [model, getBacklog(model)] :
  action.type === 'Reset' ?
  reset(model, action.source) :
  action.type === 'Latest' ?
  updateLatest(model, action.source) :
  action.type === 'GetRestore' ?
  [model, Request.get(templateLatestUrl(model.id)).map(Restore)] :
  action.type === 'Restore' ?
  restore(model, action.source) :
  action.type === 'Chart' ?
  updateChart(model, action.source) :
  action.type === 'RecipeStart' ?
  updateRecipeStart(model, action.source) :
  action.type === 'RecipeEnd' ?
  updateRecipeEnd(model, action.source) :
  Unknown.update(model, action);

const restore = (model, result) =>
  batch(update, model, [
    Latest(result),
    GetBacklog
  ]);

const updateLatest = Result.updater(
  (model, record) => {
    const actions = readRecord(record).map(DataPointAction);
    actions.push(PongPoll);
    return batch(update, model, actions);
  },
  (model, error) => update(model, MissPoll)
);

const reset = Result.updater(
  (model, record) => {
    console.log('hit Reset');
    return update(model, ChartData(readData(record)))
  },
  // @TODO retry if we have an error
  (model, error) => update(model, NoOp)
);

const updateChart = cursor({
  get: model => model.chart,
  set: (model, chart) => merge(model, {chart}),
  update: Chart.update,
  tag: ChartAction
});

const updatePoll = cursor({
  get: model => model.poll,
  set: (model, poll) => merge(model, {poll}),
  update: Poll.update,
  tag: PollAction
});

const updateRecipeStart = cursor({
  get: model => model.recipeStart,
  set: (model, recipeStart) => merge(model, {recipeStart}),
  update: EnvironmentalDataPoint.update,
  tag: RecipeStartAction
});

const updateRecipeEnd = cursor({
  get: model => model.recipeEnd,
  set: (model, recipeEnd) => merge(model, {recipeEnd}),
  update: EnvironmentalDataPoint.update,
  tag: RecipeEndAction
});

// View

export const view = (model, address) =>
  html.div({
    className: 'environment-main'
  }, [
    thunk('chart', Chart.view, model.chart, forward(address, ChartAction))
  ]);

// Helpers

const hasRecipeStart = model =>
  model.recipeStart && model.recipeStart.value && model.recipeStart.value.timestamp;

const readRow = row => row.value;
// @FIXME must check that the value returned from http call is JSON and has
// this structure before mapping.
const readRecord = record => record.rows.map(readRow);

const compareByTimestamp = (a, b) =>
  a.timestamp > b.timestamp ? 1 : -1;

const readDataPoint = ({variable, is_desired, timestamp, value}) => ({
  variable,
  timestamp,
  is_desired,
  value: Number.parseFloat(value)
});

const readData = record => {
  const data = readRecord(record).map(readDataPoint);
  data.sort(compareByTimestamp);
  return data;
};

// Create a url string that allows you to GET latest environmental datapoints
// from an environmen via CouchDB.
const templateLatestUrl = (environmentID) =>
  Template.render(Config.environmental_data_point_origin_latest, {
    origin_url: Config.origin_url,
    startkey: JSON.stringify([environmentID]),
    endkey: JSON.stringify([environmentID, {}])
  });

const templateRangeUrl = (environmentID, startTime, endTime) =>
  Template.render(Config.environmental_data_point_origin_range, {
    origin_url: Config.origin_url,
    startkey: JSON.stringify([environmentID, startTime]),
    endkey: JSON.stringify([environmentID, endTime || {}])
  });

