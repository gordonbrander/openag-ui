import {Effects} from 'reflex';
import * as Config from '../openag-config.json';
import PouchDB from 'pouchdb-browser';
import * as Database from './common/database';
import {getID} from './common/indexed';
import {merge} from './common/prelude';
import * as Unknown from './common/unknown';

// Initialize local DB
const DB = new PouchDB(Config.environments.local);

// Actions

// Request restore of in-memory model from local db.
export const Restore = {type: 'Restore'};

const Restored = result => ({
  type: 'Restored',
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
    // Attempt to restore on init
    Effects.receive(Restore)
  ];
}

export const update = (model, action) =>
  action.type === 'Restore' ?
  [model, Database.restore(DB).map(Restored)] :
  action.type === 'Restored' ?
  (
    action.result.isOk ?
    restoredOk(model, action.result.value) :
    restoredError(model, action.result.error)
  ) :
  Unknown.update(model, action);

const restoredOk = (model, record) => {
  const ids = record.map(getID);

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
