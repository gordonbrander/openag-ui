import 'whatwg-fetch';
import {Effects, Task} from 'reflex';
import {localize, localizeTemplate} from '../common/lang';
import * as Result from '../common/result';
import {compose} from '../lang/functional';
import {tag} from '../common/prelude';

// Read a Response object to JSON.
// https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
const readResponseJSON = response =>
  // If HTTP request was successful.
  // See https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch.
  response.ok ?
  response.json().then(Result.ok) :
  Promise.resolve(
    Result.error(
      localizeTemplate('Connection problem (HTTP status {{status}})', {
        status: response.status
      })
    )
  );

const readFailure = error =>
  Result.error(localize('Uh-oh! No response from the server.'));

const getFetch = url => {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  const request = new Request(url, {
    method: 'GET',
    headers
  });
  return fetch(request).then(readResponseJSON, readFailure);
}

const postFetch = (url, body) => {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  const request = new Request(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  return fetch(request).then(readResponseJSON, readFailure);
}

export const Get = url => ({
  type: 'Get',
  url
});

export const Got = tag('Got');

// Returns a get effect
export const get = url => Effects.perform(new Task((succeed, fail) => {
  getFetch(url).then(succeed);
}));

export const Post = url => ({
  type: 'Post',
  url
});

export const Posted = result => ({
  type: 'Posted',
  result
});

// Returns post effect
export const post = (url, body) =>
  Effects.perform(new Task((succeed, fail) => {
    const posted = compose(succeed, Posted);
    postFetch(url, body).then(posted, posted);
  }));
