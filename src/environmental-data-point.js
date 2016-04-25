import * as Config from '../openag-config.json';
import PouchDB from 'pouchdb';
import {html, forward, Effects, Task} from 'reflex';
import {merge, tagged, tag} from './common/prelude';
import {compose} from './lang/functional';
import * as Unknown from './common/unknown';
import * as AirTemperature from './environmental-data-point/air-temperature';

const DB = new PouchDB(Config.db_local_environmental_data_point);
// Export for debugging
window.EnvironmentalDataPointDB = DB;

// Automatically sync between local db and origin (single-board computer) DB.
// @TODO this works, but should we pipe sync operations through the
// effects system instead?
// @TODO we need to send incoming changes through effects system, to update
// model.
DB.sync(Config.db_origin_environmental_data_point, {
  live: true,
  retry: true
});

// Actions

// Request a restore from database.
export const RequestRestore = {
  type: 'RequestRestore'
};

// Restore environmental data points from data
export const Restore = data => ({
  type: 'Restore',
  data
});

// Fail a restore
export const FailRestore = () => {
  type: 'FailRestore'
};

// Effects

// Mapping functions to just get the docs from an allDocs response.
const readDocFromRow = row => row.doc;
const readResponse = database => database.rows.map(readDocFromRow);

// Get data from DB as an effect.
export const getAll = () =>
  Effects.task(new Task((succeed, fail) => {
    DB
      .allDocs({include_docs: true})
      .then(
        compose(succeed, Restore, readResponse),
        compose(fail, FailRestore)
      );
  }));

// Action mapping functions

//const AirTemperatureAction = tag('AirTemperature');

//const updateAirTemperature = cursor({
  //get: model => model.airTemperature,
  //set: (model, airTemperature) => merge(model, {airTemperature}),
  //update: AirTemperature.update,
  //tag: AirTemperatureAction
//});

// Init and update

export const init = () => [
  {
    // @TODO make this field a hash-by-id and introduce order field.
    entries: []
  },
  Effects.receive(RequestRestore)
];

// Is the problem that I'm not mapping the returned effect?
export const update = (model, action) =>
  action.type === 'RequestRestore' ?
  [model, getAll()] :
  action.type === 'Restore' ?
  [merge(model, {entries: action.data}), Effects.none] :
  action.type === 'AirTemperature' ?
  updateAirTemperature(model, action.source) :
  Unknown.update(model, action);

// @FIXME get most recent reading of each type.
// If we're missing a type, we should return a null reading or something.
const selectRecent = model =>
  model.entries.length > 0 ?
  [model.entries[0]] :
  [];

export const view = (model, address) =>
  html.div({
    className: 'dash-main'
  }, selectRecent(model).map(entry =>
    AirTemperature.view(entry, address)
  ));
