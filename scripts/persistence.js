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
import * as Result from './common/result';
import * as Database from './common/database';
import * as Unknown from './common/unknown';

// Database configuration
// Create Databbase interface for database name listed in config.
const DB = new PouchDB(Config.app.local);
// State ID is the id of the pouch record we use to persist state.
const STATE_ID = Config.app.state_id;

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

export const serialize = model => model;

export const deserialize = record => record;

// Model and update

export const update = (model, action) =>
  action.type === 'GetState' ?
  [model, Database.get(DB, STATE_ID).map(GotState)] :
  action.type === 'GotState' ?
  updateGotState(model, action.result) :
  action.type === 'FirstTimeUse' ?
  // Send up an action for parent to deal with.
  [model, Effects.receive(NotifyFirstTimeUse)] :
  action.type === 'Migrate' ?
  updateMigrate(model, action.value) :
  action.type === 'Restore' ?
  // Forward up the restore for parent to deal with.
  [model, Effects.receive(NotifyRestore(deserialize(record)))] :
  action.type === 'PutState' ?
  [model, Database.put(DB, serialize(action.value))] :
  Unknown.update(model, action);

// Handle results of fetching state from database.
export const updateGotState = Result.updater(
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

export const updateMigrate = (model, record) => {
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
