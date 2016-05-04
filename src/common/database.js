// Effect/action wrappers for common PouchDb operations

import {Effects, Task} from 'reflex';
import * as Result from '../common/result';
import {compose} from '../lang/functional';

export const RequestPut = value => ({
  type: 'RequestPut',
  value
})

export const RespondPut = value => ({
  type: 'RespondPut',
  value
});

export const FailPut = error => ({
  type: 'FailPut',
  error
});

// Create an effect to put data to a PouchDB
// @TODO probably want readFail to keep a pointer to recipe so we can
// request a re-put via effect.
export const put = (db, doc) =>
  Effects.task(new Task((succeed, fail) => {
    db
      .put(doc)
      .then(
        compose(succeed, RespondPut),
        compose(fail, FailPut)
      );
  }));

// Request a restore from database.
export const RequestRestore = {
  type: 'RequestRestore'
};

export const RespondRestore = value => ({
  type: 'RespondRestore',
  value
});

// Fail a restore
export const FailRestore = error => ({
  type: 'FailRestore',
  error
});

// Mapping functions to just get the docs from an allDocs response.
const readDocFromRow = row => row.doc;
const readDocs = database => database.rows.map(readDocFromRow);

// Request in-memory restore from DB
export const restore = db =>
  Effects.task(new Task((succeed, fail) => {
    db
      .allDocs({include_docs: true})
      .then(
        compose(succeed, RespondRestore, readDocs),
        compose(fail, FailRestore)
      );
  }));

export const requestRestore = (model, db) =>
  [model, restore(db)];

// Sync actions and effects
// See https://pouchdb.com/api.html#sync
// https://pouchdb.com/api.html#replication

// Request up-directional sync
export const Push = {
  type: 'Push'
};

export const Pushed = result => ({
  type: 'Pushed',
  result
});

const DoPush = (db, replica) =>
  Effects.task(new Task((succeed, fail) => {
    // Pouch will throw an error from xhr if there is no internet connection.
    // @TODO find out why Pouch isn't catching these 404s within the promise.
    try {
      db
        .replicate.to(replica)
        .then(
          compose(succeed, Pushed, Result.ok),
          compose(succeed, Pushed, Result.error)
        );
    }
    catch (error) {
      succeed(Pushed(Result.error(error)));
    }
  }));

export const push = (model, db, replica) =>
  [model, DoPush(db, replica)];

// Request down-directional sync
export const Pull = {
  type: 'Pull'
};

export const Pulled = result => ({
  type: 'Pulled',
  result
});

const DoPull = (db, replica) =>
  Effects.task(new Task((succeed, fail) => {
    try {
      db
        .replicate.from(replica)
        .then(
          compose(succeed, Pulled, Result.ok),
          compose(succeed, Pulled, Result.error)
        );
    }
    catch (error) {
      succeed(Pulled(Result.error(error)));
    }
  }));

export const pull = (model, db, replica) =>
  [model, DoPull(db, replica)];

// Request bi-directional sync
export const Sync = {
  type: 'Sync'
};

export const Synced = result => ({
  type: 'Synced',
  result
});

export const DoSync = (db, replica) =>
  Effects.task(new Task((succeed, fail) => {
    try {
      db
        .sync(replica)
        .then(
          compose(succeed, Synced, Result.ok),
          compose(succeed, Synced, Result.error)
        );
    }
    catch (error) {
      succeed(Synced(Result.error(error)));
    }
  }));

export const sync = (model, db, replica) =>
  [model, DoSync(db, replica)];
