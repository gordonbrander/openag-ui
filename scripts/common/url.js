/* /* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* URL helper functions */

const HTTP = /^https?:\/\//i;

// Check to see that string starts with http/https protocol.
export const isHttp = string => string.search(HTTP) > -1;

// @TODO this works in Chrome, Firefox, Safari, Opera and IE 10+.
// Maybe polyfill for older browsers?
// https://developer.mozilla.org/en-US/docs/Web/API/URL
export const url = url => new URL(url);

// Will do its best to clean up a string and make it a valid url by
// appending http if missing. Will it work? Who knows? You should always
// wrap user input to this function in a try/catch.
// Returns a url object.
export const readUrl = string =>
  !isHttp(string) ? url('http://' + string) : url(string);

// Read the root URL of a url-like string.
export const readRootUrl = string => {
  // Hostname is the url (without port number).
  // Protocol is the protocol up until the ":" (`http:`).
  // See https://developer.mozilla.org/en-US/docs/Web/API/URL
  const {protocol, hostname} = readUrl(string);
  const rootUrl = protocol + '//' + hostname;
  return rootUrl;
}