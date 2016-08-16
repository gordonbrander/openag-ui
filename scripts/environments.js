import {Effects} from 'reflex';
import * as Config from '../openag-config.json';
import PouchDB from 'pouchdb-browser';
import * as Database from './common/database';
import {render} from './common/stache';
import {merge} from './common/prelude';
import * as Unknown from './common/unknown';

// Initialize local DB
const DB = new PouchDB(Config.environments.local);

// Actions

// Configuration action comes from parent.
export const Configure = origin => ({
  type: 'Configure',
  origin
});

// Request restore of in-memory model from local db.
export const Restore = {type: 'Restore'};

const Restored = result => ({
  type: 'Restored',
  result
});

const Sync = replica => ({
  type: 'Sync',
  replica
});

const Synced = result => ({
  type: 'Synced',
  result
});

// Model, init, update

export const init = () => {
  return [
    {
      origin: null,
      active: null,
      environments: []
    },
    Effects.none
  ];
}

export const update = (model, action) =>
  action.type === 'Configure' ?
  configure(model, action.origin) :
  action.type === 'Restore' ?
  [model, Database.restore(DB).map(Restored)] :
  action.type === 'Restored' ?
  (
    action.result.isOk ?
    restoredOk(model, action.result.value) :
    restoredError(model, action.result.error)
  ) :
  action.type === 'Sync' ?
  [model, Database.sync(DB, action.replica).map(Synced)] :
  action.type === 'Synced' ?
  (
    action.result.isOk ?
    syncedOk(model, action.result.value) :
    syncedError(model, action.result.error)
  ) :
  Unknown.update(model, action);

const restoredOk = (model, record) => {
  const ids = record.map(getDocID);

  return [
    merge(model, {environments: ids}),
    Effects.none
  ];
}

const restoredError = (model, error) => {
  // @TODO error banner
  console.warn("Could not restore from environments database");
  return [model, Effects.none];
}

const syncedOk = (model, value) =>
  // If sync succeeded, restore from local db.
  update(model, Restore);

const syncedError = (model, error) => {
  console.warn("Could not connect to environments cloud DB");
  return [model, Effects.none];
}

// @TODO consider storing origin url in database? Or is this prone to attack?
const configure = (model, originUrl) => {
  // Template origin of environments database using root couchdb url sent via
  // configure action.
  const origin = render(Config.environments.origin, {
    origin_url: originUrl
  });

  return [
    // Merge origin url into model
    merge(model, {
      origin
    }),
    // Request a sync using the origin.
    Effects.receive(Sync(origin))
  ];
}

// Helpers

const getDocID = doc => doc._id;
