/*
This module handles the environment database.
*/
import {Effects} from 'reflex';
import PouchDB from 'pouchdb';
import * as Config from '../openag-config.json';
import {merge, tag, tagged, batch} from './common/prelude';
import {cursor} from './common/cursor';
import * as Unknown from './common/unknown';
import * as Database from './common/database';
import * as Indexed from './common/indexed';
import {compose} from './lang/functional';

const DB = new PouchDB(Config.db_local_environment);
// Export for debugging
window.EnvironmentsDB = DB;

const ORIGIN = Config.db_origin_environment;

// @FIXME get rid of hard-coding. We only support one environment in the UI
// right now. Find a smarter way to deal with this.
const chooseFirstEnvironmentId = entries =>
  entries.length > 0 && (typeof entries[0]._id === 'string') ?
  entries[0]._id :
  null;

// Actions and tagging functions

const Pull = Database.Pull;
const Restore = Database.Restore;

const IndexedAction = tag('Indexed');
const Reset = compose(IndexedAction, Indexed.Reset);
const Activate = compose(IndexedAction, Indexed.Activate);

// Init and update

export const init = () => [
  Indexed.create([], null),
  Effects.receive(Pull)
];

const updateIndexed = cursor({
  get: model => model,
  set: (model, patch) => merge(model, patch),
  update: Indexed.update,
  tag: IndexedAction
});

const pulledOk = model =>
  update(model, Restore);

const pulledError = model =>
  [model, Effects.none];

const restoredOk = (model, entries) =>
  batch(update, model, [
    Reset(entries),
    Activate(chooseFirstEnvironmentId(entries))
  ]);

export const update = (model, action) =>
  action.type === 'Indexed' ?
  updateIndexed(model, action.source) :
  action.type === 'Pull' ?
  Database.pull(model, DB, ORIGIN) :
  action.type === 'Pulled' ?
  (
    action.result.isOk ?
    pulledOk(model, action.result.value) :
    pulledError(model, action.result.error)
  ) :
  action.type === 'Restore' ?
  Database.restore(model, DB) :
  action.type === 'Restored' ?
  (
    action.result.isOk ?
    restoredOk(model, action.result.value) :
    restoredError(model, action.result.error)
  ) :
  Unknown.update(model, action);
