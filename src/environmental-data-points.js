import * as Config from '../openag-config.json';
import PouchDB from 'pouchdb';
import {html, forward, Effects, thunk} from 'reflex';
import {merge, tagged, tag, batch} from './common/prelude';
import * as ClassName from './common/classname';
import {cursor} from './common/cursor';
import * as Database from './common/database';
import * as Indexed from './common/indexed';
import * as Unknown from './common/unknown';
import * as Poll from './common/poll';
import {compose} from './lang/functional';
import * as AirTemperature from './environmental-data-point/air-temperature';

const DB = new PouchDB(Config.db_local_environmental_data_point);
// Export for debugging
window.EnvironmentalDataPointDB = DB;

const ORIGIN = Config.db_origin_environmental_data_point;

// Actions and action tagging functions

const PollAction = action =>
  action.type === 'Ping' ?
  Pull :
  tagged('Poll', action);

const PongPoll = PollAction(Poll.Pong);
const MissPoll = PollAction(Poll.Miss);

const RequestRestore = Database.RequestRestore;
const Pull = Database.Pull;

const AirTemperatureAction = tag('AirTemperature');

const AddManyAirTemperatures = compose(
  AirTemperatureAction,
  AirTemperature.AddMany
);

// Init and update

export const init = () => {
  const [poll, pollFx] = Poll.init();
  const [airTemperature, airTemperatureFx] = AirTemperature.init();
  return [
    {
      poll,
      airTemperature
    },
    Effects.batch([
      pollFx.map(PollAction),
      airTemperatureFx.map(AirTemperatureAction),
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
  update: AirTemperature.update,
  tag: AirTemperatureAction
});

const pulledOk = model =>
  batch(update, model, [
    PongPoll,
    RequestRestore
  ]);

const pulledError = model =>
  update(model, MissPoll);

const isAirTemperature = dataPoint =>
  dataPoint.variable === AirTemperature.variable;

const restore = (model, environmentalDataPoints) =>
  batch(update, model, [
    AddManyAirTemperatures(environmentalDataPoints.filter(isAirTemperature))
  ]);

// Is the problem that I'm not mapping the returned effect?
export const update = (model, action) =>
  action.type === 'AirTemperature' ?
  updateAirTemperature(model, action.source) :
  action.type === 'Poll' ?
  updatePoll(model, action.source) :
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
      'air-temperature',
      AirTemperature.view,
      model.airTemperature,
      forward(address, AirTemperatureAction)
    )
  ]);
