/*
This module provides the "First Time Use" experience for the app.

We need a few important details for the app to function -- IP address or web
address of the Food Computer, that kind of thing. If we don't have that info,
we prompt the user to go through the FTU. This should only happen once. The
information is stored in the browser's local storage via PouchDB.

Includes settings (like IP address of app) and, in future, log-in creds.
*/
import {html, Effects, forward, thunk} from 'reflex';
import * as Config from '../openag-config.json';
import * as Validator from './common/validator';
import * as Button from './common/button';
import * as Modal from './common/modal';
import * as Template from './common/stache';
import * as Request from './common/request';
import * as Result from './common/result';
import {readRootUrl} from './common/url';
import {tag, tagged, merge, batch} from './common/prelude';
import {classed, toggle} from './common/attr';
import {cursor} from './common/cursor';
import {localize} from './common/lang';
import * as Unknown from './common/unknown';
import {compose} from './lang/functional';

// Actions

const TagModal = tag('Modal');

export const Open = TagModal(Modal.Open);
export const Close = TagModal(Modal.Close);

const TagName = action =>
  action.type === 'Check' ?
  TryName(action.value) :
  tagged('Name', action);

const NameOk = compose(TagName, Validator.Ok);
const NameError = compose(TagName, Validator.Error);

const TryName = value => ({
  type: 'TryName',
  value
});

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

const Submit = {type: 'Submit'};

const TagSubmitter = action =>
  tagged('Submitter', action);

const EnableSubmitter = TagSubmitter(Button.Enable);
const DisableSubmitter = TagSubmitter(Button.Disable);

// Model and update

export const init = () => {
  const host = window.location.host;

  const [name, nameFx] = Validator.init(
    '',
    localize('Give your Food Computer a name'),
    localize('Alice'),
    null,
    false,
    false
  );

  const [address, addressFx] = Validator.init(
    host,
    localize('A web or IP address to connect to'),
    localize('0.0.0.0'),
    null,
    false,
    false
  );

  const [submitter, submitterFx] = Button.init(localize('Save'), false, true, false, false);
  
  return [
    {
      isOpen: false,
      name,
      address,
      submitter
    },
    Effects.batch([
      addressFx.map(TagAddress),
      nameFx.map(TagName),
      submitterFx.map(TagSubmitter)
    ])
  ];
}

export const update = (model, action) =>
  action.type === 'Modal' ?
  updateModal(model, action.source) :
  action.type === 'Address' ?
  updateAddress(model, action.source) :
  action.type === 'Submitter' ?
  updateSubmitter(model, action.source) :
  action.type === 'Name' ?
  updateName(model, action.source) :
  action.type === 'Submit' ?
  submit(model) :
  action.type === 'TryName' ?
  tryName(model, action.value) :
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

const updateName = cursor({
  get: model => model.name,
  set: (model, name) => merge(model, {name}),
  update: Validator.update,
  tag: TagName
});

const updateSubmitter = cursor({
  get: model => model.submitter,
  set: (model, submitter) => merge(model, {submitter}),
  update: Button.update,
  tag: TagSubmitter
});

const submit = model => {
  if (Validator.isOk(model.address)) {
    const value = Validator.readValue(model.address);
    const rooturl = readRootUrl(value);
    return [model, Effects.receive(NotifyHeartbeat(rooturl))];
  }
  else {
    return [model, Effects.none];
  }
}

const tryAddress = (model, value) => {
  try {
    // Attempt to read a valid URL from user input. 
    const url = readRootUrl(value);
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

    return batch(update, model, [
      AddressOk(message),
      EnableSubmitter
    ]);
  },
  (model, error) => {
    return update(model, AddressError(error));
  }
);


const tryName = (model, value) => {
  const message = chooseRandom(NAME_MESSAGES);
  return update(model, NameOk(message));
}

// View

export const viewFTU = (model, address) =>
  html.div({
    className: 'ftu'
  }, [
    html.dialog({
      className: classed({
        'ftu-window': true,
        'ftu-window--close': !model.isOpen
      }),
      open: toggle(model.isOpen, 'open')
    }, [
      html.div({
        className: 'panels--main'
      }, [
        html.div({
          className: 'panel--main panel--lv0'
        }, [
          html.header({
            className: 'panel--header'
          }, [
            html.h1({
              className: 'panel--title'
            }, [
              localize('Welcome')
            ]),
            html.div({
              className: 'panel--nav-right'
            }, [
              thunk(
                'submit',
                Button.view,
                model.submitter,
                forward(address, TagSubmitter),
                'btn-panel'
              ),
            ])
          ]),
          html.div({
            className: 'panel--content-in'
          }, [
            html.p({}, [
              localize("Congratulations! You're now the proud owner of a Food Computer. We just need a couple of things to get started.")
            ]),
            Validator.view(model.name, forward(address, TagName), 'ftu-validator'),
            Validator.view(model.address, forward(address, TagAddress), 'ftu-validator')
          ])
        ])
      ])
    ])
  ]);

// Helpers

const NAME_MESSAGES = [
  localize('Good choice!'),
  localize('Good one!'),
  localize('You picked a good one!'),
  localize('One in a million!')
];

const chooseRandom = array => {
  const i = Math.floor(Math.random() * array.length);
  return array[i];
}