import * as Config from '../openag-config.json';
import PouchDB from 'pouchdb';
import {html, forward, Effects, thunk} from 'reflex';
import {merge, tagged, tag, batch} from './common/prelude';
import * as ClassName from './common/classname';
import {cursor} from './common/cursor';
import * as Database from './common/database';
import * as Request from './common/request';
import * as Indexed from './common/indexed';
import * as Unknown from './common/unknown';
import * as Poll from './common/poll';
import {compose} from './lang/functional';
import * as EnvironmentalDataPoint from './environmental-data-point';
// @TODO do proper localization
import * as LANG from './environmental-data-point/lang';

const DB = new PouchDB(Config.db_local_environmental_data_point);
// Export for debugging
window.EnvironmentalDataPointDB = DB;

const ORIGIN = Config.db_origin_environmental_data_point;
const ORIGIN_LATEST = Config.db_origin_environmental_data_point_latest;
const AIR_TEMPERATURE = 'air_temperature';
const WATER_TEMPERATURE = 'water_temperature';

// Matching functions

const matcher = (key, value) => (object) =>
  object[key] === value;

const isAirTemperature = matcher('variable', AIR_TEMPERATURE);
const isWaterTemperature = matcher('variable', WATER_TEMPERATURE);

// Actions and action tagging functions

const PollAction = action =>
  action.type === 'Ping' ?
  Get(ORIGIN_LATEST) :
  tagged('Poll', action);

const PongPoll = PollAction(Poll.Pong);
const MissPoll = PollAction(Poll.Miss);

const Get = Request.Get;

const RequestRestore = Database.RequestRestore;
const Pull = Database.Pull;

const AirTemperatureAction = tag('AirTemperature');
const WaterTemperatureAction = tag('WaterTemperature');

const AddManyAirTemperatures = compose(
  AirTemperatureAction,
  EnvironmentalDataPoint.AddMany
);

const AddManyWaterTemperatures = compose(
  WaterTemperatureAction,
  EnvironmentalDataPoint.AddMany
);

// Init and update

export const init = () => {
  const [poll, pollFx] = Poll.init();

  const [airTemperature, airTemperatureFx] = EnvironmentalDataPoint.init(
    AIR_TEMPERATURE,
    LANG[AIR_TEMPERATURE]
  );

  const [waterTemperature, waterTemperatureFx] = EnvironmentalDataPoint.init(
    WATER_TEMPERATURE,
    LANG[WATER_TEMPERATURE]
  );

  return [
    {
      poll,
      airTemperature,
      waterTemperature
    },
    Effects.batch([
      pollFx.map(PollAction),
      airTemperatureFx.map(AirTemperatureAction),
      waterTemperatureFx.map(WaterTemperatureAction),
      // @TODO we should batch this into a Restore action that batches
      // Database.RequestRestore and Database.Pull.
      Effects.receive(RequestRestore),
      Effects.receive(Pull)
    ])
  ];
};

const updatePoll = cursor({
  get: model => model.poll,
  set: (model, poll) => merge(model, {poll}),
  update: Poll.update,
  tag: PollAction
});

const updateAirTemperature = cursor({
  get: model => model.airTemperature,
  set: (model, airTemperature) => merge(model, {airTemperature}),
  update: EnvironmentalDataPoint.update,
  tag: AirTemperatureAction
});

const updateWaterTemperature = cursor({
  get: model => model.waterTemperature,
  set: (model, waterTemperature) => merge(model, {waterTemperature}),
  update: EnvironmentalDataPoint.update,
  tag: WaterTemperatureAction
});

const pulledOk = model =>
  batch(update, model, [
    PongPoll,
    RequestRestore
  ]);

const pulledError = model =>
  update(model, MissPoll);

const restore = (model, environmentalDataPoints) =>
  batch(update, model, [
    AddManyAirTemperatures(environmentalDataPoints.filter(isAirTemperature)),
    AddManyWaterTemperatures(environmentalDataPoints.filter(isWaterTemperature))
  ]);

const readDataPointFromRow = row => row.value;

const gotOk = (model, record) =>
  batch(update, model, [
    AddManyAirTemperatures(
      record.rows
      .map(readDataPointFromRow)
      .filter(dataPoint => dataPoint.variable === AIR_TEMPERATURE)
    ),
    AddManyWaterTemperatures(
      record.rows
      .map(readDataPointFromRow)
      .filter(dataPoint => dataPoint.variable === WATER_TEMPERATURE)
    )
  ]);

// Is the problem that I'm not mapping the returned effect?
export const update = (model, action) =>
  action.type === 'AirTemperature' ?
  updateAirTemperature(model, action.source) :
  action.type === 'WaterTemperature' ?
  updateWaterTemperature(model, action.source) :
  action.type === 'Poll' ?
  updatePoll(model, action.source) :
  action.type === 'Get' ?
  Request.get(model, action.url) :
  action.type === 'Got' ?
  (
    action.result.isOk ?
    gotOk(model, action.result.value) :
    [model, Effects.none]
  ) :
  action.type === 'Pull' ?
  Database.pull(model, DB, ORIGIN) :
  action.type === 'Pulled' ?
  (
    action.result.isOk ?
    pulledOk(model) :
    pulledError(model)
  ) :
  action.type === 'RequestRestore' ?
  Database.requestRestore(model, DB) :
  action.type === 'RespondRestore' ?
  // @TODO should validate input before merging
  restore(model, action.value) :
  Unknown.update(model, action);

export const view = (model, address) =>
  html.div({
    className: 'dash-main'
  }, [
    thunk(
      'water-temperature',
      EnvironmentalDataPoint.view,
      model.waterTemperature,
      forward(address, WaterTemperatureAction)
    ),
    thunk(
      'air-temperature',
      EnvironmentalDataPoint.view,
      model.airTemperature,
      forward(address, AirTemperatureAction)
    )
  ]);
