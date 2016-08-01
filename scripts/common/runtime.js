/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Adapted from https://github.com/browserhtml/browserhtml/blob/master/src/common/runtime.js */

import * as QueryString from 'querystring';

const Env = () => {
  const search = window.location.search;
  return QueryString.parse(search.substr(1));
}

export const env = Env();