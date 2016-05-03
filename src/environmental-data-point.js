import * as Config from '../openag-config.json';
import PouchDB from 'pouchdb';
import {html, forward, Effects} from 'reflex';
import {merge, tagged, tag, batch} from './common/prelude';
import * as ClassName from './common/classname';
import {cursor} from './common/cursor';
import * as Database from './common/database';
import {indexByID, orderByID, add} from './common/indexed';
import * as Modal from './common/modal';
import * as Unknown from './common/unknown';
import * as Poll from './common/poll';
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

// Re-export modal actions.
// @TODO these should be tagged Modal and delegated to Modal.update
export const Open = Modal.Open;
export const Close = Modal.Close;

// Action mapping functions

//const AirTemperatureAction = tag('AirTemperature');

//const updateAirTemperature = cursor({
  //get: model => model.airTemperature,
  //set: (model, airTemperature) => merge(model, {airTemperature}),
  //update: AirTemperature.update,
  //tag: AirTemperatureAction
//});

// Init and update

// Create new Environmental Data Point model.
export const reset = environmentalDataPoints => {
  const [poll, pollFx] = Poll.init();
  return [
    {
      poll,
      isOpen: true,
      // Build an array of ordered recipe IDs
      order: orderByID(environmentalDataPoints),
      // Index all recipes by ID
      entries: indexByID(environmentalDataPoints)
    },
    pollFx.map(PollAction)
  ];
};

export const init = () => {
  const [model, fx] = reset([]);

  return [
    model,
    Effects.batch([
      fx,
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

const pulledOk = (model, action) =>
  batch(update, model, [
    PongPoll,
    RequestRestore
  ]);

const pulledError = model =>
  update(model, MissPoll);

// Is the problem that I'm not mapping the returned effect?
export const update = (model, action) =>
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
  reset(action.value) :
  // When sync completes, request in-memory restore from local db
  action.type === 'AirTemperature' ?
  updateAirTemperature(model, action.source) :
  action.type === 'Open' ?
  Modal.open(model) :
  action.type === 'Close' ?
  Modal.close(model) :
  Unknown.update(model, action);

// @FIXME get most recent reading of each type.
// If we're missing a type, we should return a null reading or something.
const selectRecent = model =>
  model.order.length > 0 ?
  [model.entries[model.order[0]]] :
  [];

export const view = (model, address) =>
  html.div({
    className: ClassName.create({
      'dash-main': true,
      'dash-main-close': !model.isOpen
    })
  }, selectRecent(model).map(entry =>
    AirTemperature.view(entry, address)
  ));
