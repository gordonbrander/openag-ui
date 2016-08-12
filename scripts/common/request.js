import 'whatwg-fetch';
import {Effects, Task} from 'reflex';
import {localize, localizeTemplate} from '../common/lang';
import * as Result from '../common/result';
import {compose} from '../lang/functional';
import {tag} from '../common/prelude';

// Actions

export const Get = url => ({
  type: 'Get',
  url
});

export const Got = result => ({
  type: 'Got',
  result
});

export const Post = url => ({
  type: 'Post',
  url
});

export const Posted = result => ({
  type: 'Posted',
  result
});

// Effects

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

// Returns a get effect
// You'll want to use the `.map()` method on the return value to map this
// into an action.
export const get = url => Effects.perform(new Task(succeed => {
  getFetch(url).then(succeed);
}));

// Returns post effect
// You'll want to use the `.map()` method on the return value to map this
// into an action.
export const post = (url, body) => Effects.perform(new Task(succeed => {
  postFetch(url, body).then(succeed);
}));
