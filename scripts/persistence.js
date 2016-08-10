/*
This module provides local persistence for app state.

This includes settings (like IP address of app) and, in future, log-in creds.
*/
import {Effects} from 'reflex';
import PouchDB from 'pouchdb-browser';

// Import package.json version for app version.
// Note: it is important to change the package version number if the record
// data structure changes. Otherwise user's persisted data will not match what
// app expects.
import {version} from '../package.json';
import * as Config from '../openag-config.json';
import {merge} from './common/prelude.js';
import * as Result from './common/result';
import * as Database from './common/database';
import * as Unknown from './common/unknown';

// Database configuration
// Create Databbase interface for database name listed in config.
const DB = new PouchDB(Config.app.local);

// Actions

export const FirstTimeUse = {type: 'FirstTimeUse'};
export const NotifyFirstTimeUse = {type: 'NotifyFirstTimeUse'};

export const GetState = {type: 'GetState'};

const GotState = result => ({
  type: 'GotState',
  result
});

export const PutState = value => ({
  type: 'PutState',
  value
});

const PuttedState = result => ({
  type: 'PuttedState',
  result
});

const Migrate = value => ({
  type: 'Migrate',
  value
});

const Restore = value => ({
  type: 'Restore',
  value
});

const NotifyRestore = value => ({
  type: 'NotifyRestore',
  value
});

const NotifyBanner = message => ({
  type: 'NotifyBanner',
  message
});

// Deals with migrating old record data structures to new record data structures.
// We keep cycling from migrations (from one to the next) until we reach the
// current version.
const migrate = record =>
  record.version === version ?
  record :
  migrateUnknown(record);

const migrateUnknown = record => {
  console.warn(`Unknown state version ${record.version}`);
  return null;
}

// Model and update

export const update = (model, action) =>
  action.type === 'GetState' ?
  [model, Database.get(DB, model._id).map(GotState)] :
  action.type === 'GotState' ?
  updateGotState(model, action.result) :
  action.type === 'FirstTimeUse' ?
  // Send up an action for parent to deal with.
  [model, Effects.receive(NotifyFirstTimeUse)] :
  action.type === 'Migrate' ?
  updateMigrate(model, action.value) :
  action.type === 'Restore' ?
  // Forward up the restore for parent to deal with.
  updateRestore(model, action.value) :
  action.type === 'PutState' ?
  [model, Database.put(DB, action.value).map(PuttedState)] :
  action.type === 'PuttedState' ?
  updatePuttedState(model, action.result) :
  Unknown.update(model, action);

// Handle results of fetching state from database.
const updateGotState = Result.updater(
  (model, record) => (
    record.version !== version ?
    // If state was found,
    // and the app is in initial state,
    // but version does not match application version,
    // then attempt to migrate the state.
    update(model, Migrate(record)) :
  
    // If state was found
    // and app is in initial state
    // and version matches application version.
    update(model, Restore(record))
  ),
  // If no state was found,
  // then start in initial state (show the FTU experience).
  (model, error) => update(model, FirstTimeUse)
);

//
const updatePuttedState = Result.updater(
  (model, record) => {
    // Merge rev from successful put into model.
    // See https://pouchdb.com/api.html#create_document for example response.
    const next = merge(model, {_rev: record.rev});

    return [
      next,
      Effects.none
    ]
  },
  (model, error) => {
    const message = localize("Couldn't save to settings database");
    const action = NotifyBanner(message);

    return [
      model,
      Effects.receive(action)
    ];
  }
);

const updateRestore = (model, record) => [
  merge(model, {
    _id: record._id,
    _rev: record._rev
  }),
  Effects.receive(NotifyRestore(record))
];

const updateMigrate = (model, record) => {
  const migrated = migrate(record);

  const action = (
    // if migration was successful, then restore with updated record.
    migrated !== null ?
    Restore(migrated) :
    // otherwise, we have no choice but to go through FTU again.
    FirstTimeUse
  );

  return update(model, action);
}
