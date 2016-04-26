import * as Config from '../openag-config.json';
import PouchDB from 'pouchdb';
import {html, forward, Effects, Task} from 'reflex';
import {merge, tagged, tag} from './common/prelude';
import {RequestRestore, restore, sync} from './common/db';
import {indexByID, orderByID, add} from './common/indexed';
import * as Unknown from './common/unknown';
import * as AirTemperature from './environmental-data-point/air-temperature';

const DB = new PouchDB(Config.db_local_environmental_data_point);
// Export for debugging
window.EnvironmentalDataPointDB = DB;

const ORIGIN = Config.db_origin_environmental_data_point;

// Automatically sync between local db and origin (single-board computer) DB.
// @TODO this works, but should we pipe sync operations through the
// effects system instead?
// @TODO we need to send incoming changes through effects system, to update
// model.
//DB.sync(Config.db_origin_environmental_data_point, {
  //live: true,
  //retry: true
//});

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
export const create = environmentalDataPoints => ({
  // Build an array of ordered recipe IDs
  order: orderByID(environmentalDataPoints),
  // Index all recipes by ID
  entries: indexByID(environmentalDataPoints)
});

export const init = () => [
  create([]),
  Effects.batch([
    Effects.receive(RequestRestore),
    sync(DB, ORIGIN)
  ])
];

// Is the problem that I'm not mapping the returned effect?
export const update = (model, action) =>
  action.type === 'RequestRestore' ?
  [model, restore(DB)] :
  action.type === 'RespondRestore' ?
  // @TODO should validate input before merging
  [create(action.value), Effects.none] :
  // When sync completes, request in-memory restore from local db
  action.type === 'CompleteSync' ?
  [model, Effects.receive(RequestRestore)] :
  action.type === 'AirTemperature' ?
  updateAirTemperature(model, action.source) :
  Unknown.update(model, action);

// @FIXME get most recent reading of each type.
// If we're missing a type, we should return a null reading or something.
const selectRecent = model =>
  model.order.length > 0 ?
  [model.entries[model.order[0]]] :
  [];

export const view = (model, address) =>
  html.div({
    className: 'dash-main'
  }, selectRecent(model).map(entry =>
    AirTemperature.view(entry, address)
  ));
