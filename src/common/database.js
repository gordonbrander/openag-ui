// Effect/action wrappers for common PouchDb operations

import {Effects, Task} from 'reflex';
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
export const FailRestore = error => {
  type: 'FailRestore',
  error
};

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

// Sync actions and effects
// See https://pouchdb.com/api.html#sync
// https://pouchdb.com/api.html#replication

// Request bi-directional sync
export const RequestSync = {
  type: 'RequestSync'
};

export const CompleteSync = value => ({
  type: 'CompleteSync',
  value
});

export const FailSync = error => ({
  type: 'FailSync',
  error
});

export const sync = (db, replica) =>
  Effects.task(new Task((succeed, fail) => {
    db
      .sync(replica)
      .then(
        compose(succeed, CompleteSync),
        compose(fail, FailSync)
      );
  }));
