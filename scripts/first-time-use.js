/*
This module provides the "First Time Use" experience for the app.

We need a few important details for the app to function -- IP address or web
address of the Food Computer, that kind of thing. If we don't have that info,
we prompt the user to go through the FTU. This should only happen once. The
information is stored in the browser's local storage via PouchDB.

Includes settings (like IP address of app) and, in future, log-in creds.
*/
import {html, Effects, forward} from 'reflex';
import * as Config from '../openag-config.json';
import * as Validator from './common/validator';
import * as Modal from './common/modal';
import * as Template from './common/stache';
import * as Request from './common/request';
import * as Result from './common/result';
import {readRootUrl} from './common/url';
import {tag, tagged, merge} from './common/prelude';
import {classed, toggle} from './common/attr';
import {cursor} from './common/cursor';
import {localize} from './common/lang';
import * as Unknown from './common/unknown';
import {compose} from './lang/functional';

// Actions

const TagModal = tag('Modal');

export const Open = TagModal(Modal.Open);
export const Close = TagModal(Modal.Close);

const TryAddress = value => ({
  type: 'TryAddress',
  value
});

// Test connection to PFC
const GetHeartbeat = url => ({
  type: 'GetHeartbeat',
  url
});

const GotHeartbeat = result => ({
  type: 'GotHeartbeat',
  result
});

// Let the parent know we had a successful heartbeat.
const NotifyHeartbeat = url => ({
  type: 'NotifyHeartbeat',
  url
});

const TagAddress = action =>
  action.type === 'Check' ?
  TryAddress(action.value) :
  tagged('Address', action);

const AddressOk = compose(TagAddress, Validator.Ok);
const AddressError = compose(TagAddress, Validator.Error);

// Model and update

export const init = () => {
  const host = window.location.host;
  const [address, addressFx] = Validator.init(host, null, localize('Web or IP address...'));
  
  return [
    {
      isOpen: false,
      address
    },
    addressFx.map(TagAddress)
  ];
}

export const update = (model, action) =>
  action.type === 'Modal' ?
  updateModal(model, action.source) :
  action.type === 'Address' ?
  updateAddress(model, action.source) :
  action.type === 'TryAddress' ?
  tryAddress(model, action.value) :
  action.type === 'GetHeartbeat' ?
  getHeartbeat(model, action.url) :
  action.type === 'GotHeartbeat' ?
  gotHeartbeat(model, action.result) :
  Unknown.update(model, action);

const updateModal = cursor({
  update: Modal.update,
  tag: TagModal
});

const updateAddress = cursor({
  get: model => model.address,
  set: (model, address) => merge(model, {address}),
  update: Validator.update,
  tag: TagAddress
});

const tryAddress = (model, value) => {
  try {
    // Attempt to read a valid URL from user input. 
    const url = readRootUrl(value);
    // Send a heartbeat request if successful.
    return update(model, GetHeartbeat(url));
  }
  catch (e) {
    // Otherwise, send an address error.
    const message = localize("Need a valid URL or IP address");
    return update(model, AddressError(message));
  }
}

const getHeartbeat = (model, url) => {
  const heartbeatUrl = Template.render(Config.heartbeat, {
    root_url: url
  });

  return [model, Request.get(heartbeatUrl).map(GotHeartbeat)];
}

const gotHeartbeat = Result.updater(
  (model, value) => {
    const message = localize('Success! Connected to Food Computer.');
    const [next, fx] = update(model, AddressOk(message));

    const rootUrl = readRootUrl(next.address.input.value);

    return [
      next,
      Effects.batch([
        fx,
        Effects.receive(NotifyHeartbeat(rootUrl))
      ])
    ];
  },
  (model, error) => {
    const [next, fx] = update(model, AddressError(error));
    return [next, fx];
  }
);

// View

export const viewFTU = (model, address) =>
  html.div({
    className: 'ftu scene',
    hidden: toggle(!model.isOpen, 'hidden')
  }, [
    Validator.view(model.address, forward(address, TagAddress), 'ftu-address'),
  ]);