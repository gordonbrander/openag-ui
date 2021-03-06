import * as Config from '../openag-config.json';
import PouchDB from 'pouchdb';
import {html, forward, Effects, Task} from 'reflex';
import {merge, tagged, tag} from './common/prelude';
import {compose} from './lang/functional';
import * as Unknown from './common/unknown';
import * as AirTemperature from './environmental-data-point/air-temperature';

const DB = new PouchDB(Config.db_environmental_data_point);
// Export for debugging
window.EnvironmentalDataPointDB = DB;

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

// @FIXME temporary measure. Need to give each sensor type its own
// model field.
const readAirTemperature = (model) => model.entries[0];

export const view = (model, address) =>
  html.div({
    className: 'dash-main'
  }, model.entries.map(entry =>
    AirTemperature.view(entry, address)
  ));
