/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
Adapted from https://github.com/browserhtml/browserhtml/blob/e76c4ce9d85acec365dd614dc37fae54ec056af7/src/devtools/log.js
*/
import {Effects} from 'reflex';
import * as Unknown from '../common/unknown';

export const Debuggee = debuggee => ({
  type: "Debuggee",
  debuggee
});

export const raw = 'raw';
export const ignore = null;

export const init = (mode) => [
  // "raw" mode = logging actions through console.
  // "none" = no logging.
  (mode === 'raw' ? raw : ignore),
  Effects.none
];

export const update = (model, action) =>
  action.type === 'Debuggee' ?
  log(model, action.debuggee) :
  Unknown.update(model, action);

const log = (model, action) => {
  console.log('Action >>', action);
  return [model, Effects.none];
}