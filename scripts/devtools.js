/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


/*
Adapted from https://github.com/browserhtml/browserhtml/blob/master/src/devtools.js.

This file wraps the app module and gives us developer features like logging.
*/

import {Effects, forward} from 'reflex';
import * as Log from './devtools/log';
import {cursor} from './common/cursor';
import {tag} from './common/prelude';
import * as Runtime from './common/runtime';
import * as Unknown from './common/unknown';

// Actions

const TagLog = tag('Log');
const TagDebuggee = tag('Debuggee');

// Model, init and update

const Model = (
  debuggee,
  Debuggee,
  log
) => ({
  debuggee,
  Debuggee,
  log
});

export const init = ({Debuggee, flags}) => { 
  // Check runtime environment (query string parameters) to see if we should log.
  const shouldLog = Runtime.env.log;

  const [debuggee, debuggeeFx] = Debuggee.init(flags);
  const [log, logFx] = Log.init(shouldLog ? 'raw' : 'none');

  const model = Model(
    debuggee,
    Debuggee,
    log
  );

  return [
    model,
    Effects.batch([
      logFx.map(TagLog),
      debuggeeFx.map(TagDebuggee)
    ])
  ];
}

export const update = (model, action) =>
  action.type === 'Log' ?
  updateLog(model, action.source) :
  action.type === 'Debuggee' ?
  updateDebugee(model, action.source) :
  Unknown.update(model, action);

const updateLog = cursor({
  get: model => model.log,
  set: (model, log) => Model(model.debuggee, model.Debuggee, log),
  update: Log.update,
  tag: TagLog
});

const updateDebugee = (model, action) => {
  const ignore = [Log.ignore, Effects.none];
  const {Debuggee} = model;

  const [log, logFx] = (
    model.log === Log.ignore
    ? ignore
    : Log.update(model.log, Log.Debuggee(action))
  );

  const [debuggee, debuggeeFx] = Debuggee.update(model.debuggee, action);

  const fx = Effects.batch([
    logFx.map(TagLog),
    debuggeeFx.map(TagDebuggee)
  ]);

  const next = Model(debuggee, Debuggee, log);

  return [next, fx];
}

// View

export const view = (model, address) =>
  model.Debuggee.view(model.debuggee, forward(address, TagDebuggee))