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
import PouchDB from 'pouchdb-browser';
import * as Database from './common/database';
import * as Validator from './common/validator';
import * as Select from './common/select';
import {assemble as assembleOption} from './common/option';
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

// Create a PouchDB instance for the local environments db, so we can
// sync to it.
const DB = new PouchDB(Config.environments.local);

// Actions

const TagModal = tag('Modal');

export const Open = TagModal(Modal.Open);
export const Close = TagModal(Modal.Close);

const SyncEnvironments = origin => ({
  type: 'SyncEnvironments',
  origin
});

const SyncedEnvironments = result => ({
  type: 'SyncedEnvironments',
  result
});

const RestoreEnvironments = {type: 'RestoreEnvironments'};

const RestoredEnvironments = result => ({
  type: 'RestoredEnvironments',
  result
});

const TagEnvironments = action =>
  tagged('Environments', action);

const EnvironmentsOptions = compose(TagEnvironments, Select.Options);

const TagName = action =>
  action.type === 'Validate' ?
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

// Let the parent know we had a successful form submit.
const NotifySubmit = form => ({
  type: 'NotifySubmit',
  form
});

const TagAddress = action =>
  action.type === 'Validate' ?
  TryAddress(action.value) :
  action.type === 'Rest' ?
  RestAddress :
  tagged('Address', action);

const AddressOk = compose(TagAddress, Validator.Ok);
const AddressError = compose(TagAddress, Validator.Error);

const RestAddress = {type: 'RestAddress'};

const Submit = {type: 'Submit'};

const TagSubmitter = action =>
  action.type === 'Click' ?
  Submit :
  tagged('Submitter', action);

const EnableSubmitter = TagSubmitter(Button.Enable);
const DisableSubmitter = TagSubmitter(Button.Disable);

// Model and update

export const init = () => {
  const host = window.location.host;

  const [name, nameFx] = Validator.init(
    '',
    localize('Name your Food Computer'),
    chooseRandom(NAMES),
    null,
    false,
    false
  );

  const [address, addressFx] = Validator.init(
    host,
    localize('The web or IP address of your Food Computer'),
    localize('0.0.0.0'),
    null,
    false,
    false
  );

  const [environments, environmentsFx] = Select.init();

  const [submitter, submitterFx] = Button.init(localize('Save'), false, true, false, false);
  
  return [
    {
      isOpen: false,
      name,
      address,
      submitter,
      environments
    },
    Effects.batch([
      addressFx.map(TagAddress),
      nameFx.map(TagName),
      submitterFx.map(TagSubmitter),
      environmentsFx.map(TagEnvironments)
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
  action.type === 'Environments' ?
  updateEnvironments(model, action.source) :
  action.type === 'Submit' ?
  submit(model) :
  action.type === 'TryName' ?
  tryName(model, action.value) :
  action.type === 'TryAddress' ?
  tryAddress(model, action.value) :
  action.type === 'RestAddress' ?
  restAddress(model) :
  action.type === 'GetHeartbeat' ?
  getHeartbeat(model, action.url) :
  action.type === 'GotHeartbeat' ?
  gotHeartbeat(model, action.result) :
  action.type === 'SyncEnvironments' ?
  // Currently we keep environments database in the environments module.
  // Send request up to parent to get this info.
  syncEnvironments(model, action.origin) :
  action.type === 'SyncedEnvironments' ?
  (
    action.result.isOk ?
    syncedEnvironmentsOk(model, action.result.value) :
    syncedEnvironmentsError(model, action.result.error)
  ) :
  action.type === 'RestoreEnvironments' ?
  [model, Database.restore(DB).map(RestoredEnvironments)] :
  action.type === 'RestoredEnvironments' ?
  (
    action.result.isOk ?
    restoredEnvironmentsOk(model, action.result.value) :
    restoredEnvironmentsError(model, action.result.error)
  ) :
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

const updateEnvironments = cursor({
  get: model => model.environments,
  set: (model, environments) => merge(model, {environments}),
  update: Select.update,
  tag: TagEnvironments
});

const updateSubmitter = cursor({
  get: model => model.submitter,
  set: (model, submitter) => merge(model, {submitter}),
  update: Button.update,
  tag: TagSubmitter
});

const submit = model => {
  // We only care about validating the address. Any name will do.
  if (Validator.isOk(model.address)) {
    const addressValue = Validator.readValue(model.address);
    const rootUrl = readRootUrl(addressValue);

    // Given root URL, template API url.
    const api = Template.render(Config.api, {
      root_url: rootUrl
    });

    // Given root URL, origin CouchDB url.
    const origin = Template.render(Config.origin, {
      root_url: rootUrl
    });

    const nameValue = Validator.readValue(model.name);
    const environmentName = readName(nameValue);

    const environmentID = Select.readValue(model.environments);

    // Construct form message to send up to app.
    const form = {
      environment: {
        id: environmentID,
        name: environmentName
      },
      api,
      origin
    };

    return [model, Effects.receive(NotifySubmit(form))];
  }
  // We should never be able to hit this case.
  else {
    console.warn('First time use form was submitted, but url was not valid.');
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

const restAddress = model => {
  const [one, oneFx] = updateAddress(model, Validator.Rest);
  const [two, twoFx] = updateSubmitter(one, Button.Disable);

  return [
    two,
    Effects.batch([
      oneFx,
      twoFx
    ])
  ];
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

    const addressValue = Validator.readValue(model.address);
    const rootUrl = readRootUrl(addressValue);

    // Given root URL, origin CouchDB url.
    const origin = Template.render(Config.origin, {
      root_url: rootUrl
    });

    return batch(update, model, [
      AddressOk(message),
      SyncEnvironments(origin)
    ]);
  },
  (model, error) => {
    return update(model, AddressError(error));
  }
);

const syncEnvironments = (model, origin) => {
  // Render environment url
  const environments = Template.render(Config.environments.origin, {
    origin_url: origin
  });

  return [model, Database.sync(DB, environments).map(SyncedEnvironments)];
}

const syncedEnvironmentsOk = (model, value) =>
  update(model, RestoreEnvironments);

const syncedEnvironmentsError = (model, error) => {
  // @FIXME error banner or some feedback.
  return [model, Effects.none];
}

const restoredEnvironmentsOk = (model, rows) => {
  const options = rows.map(readOptionFromRecord);

  return batch(update, model, [
    // Fill select box with options.
    EnvironmentsOptions(options),
    // Enable submit button, because we're in a valid state now.
    EnableSubmitter
  ]);
}

const restoredEnvironmentsError = (model, error) => {
  // @FIXME error banner or some feedback.
  return [model, Effects.none];  
}

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
            className: 'panel--content'
          }, [
            html.div({
              className: 'panel--in'
            }, [
              html.p({}, [
                localize("It's almost time to get planting! We just need a few details to get your Food Computer up and running.")
              ]),
              thunk(
                'ftu-validator-name',
                Validator.view,
                model.name,
                forward(address, TagName),
                'ftu-validator'
              ),
              thunk(
                'ftu-validator-address',
                Validator.view,
                model.address,
                forward(address, TagAddress),
                'ftu-validator'
              ),
              html.div({
                className: 'labeled'
              }, [
                thunk(
                  'ftu-select-environment',
                  Select.view,
                  model.environments,
                  forward(address, TagEnvironments),
                  'select ftu-select'
                ),
                html.label({
                  className: 'labeled--label'
                }, [
                  localize('Choose an environment')
                ])
              ]),
              html.p({
                className: 'tip'
              }, [
                html.b({}, ['Tip:']),
                ' ',
                localize("don't know how to find the IP address of your Food Computer? Try using Adafruit's Raspberry Pi Finder.")
              ])
            ])
          ])
        ])
      ])
    ])
  ]);

// Helpers

const ALL_SPACES = /^\s*$/;

const DEFAULT_NAME = localize('Food Computer');

const NAMES = [
  'Bert',
  'Alice',
  'Bob',
  'Foody McFoodface',
  'Planty McPlantface',
  'Audrey II',
  'Hal 9000',
  'Bender',
  'Calculon',
  'Optimus Prime',
  'T-1000',
  'Bill Murray',
  'Eve',
  'Wall-E',
  'Marvin',
  'Rosie',
  'Tom Servo',
  'Ultron',
  'Dalek',
  'Baymax',
  'GLaDOS',
  'Astro Boy',
  'Voltron',
  'Megatron'
];

const NAME_MESSAGES = [
  localize('Good choice!'),
  localize('Good name!'),
  localize('Good one!'),
  localize('You picked a good one!'),
  localize("It's a good name."),
  localize("That's a nice name."),
  localize('One in a million!')
];

const chooseRandom = array => {
  const i = Math.floor(Math.random() * array.length);
  return array[i];
}

const readName = name =>
  name.search(ALL_SPACES) === -1 ?
  name :
  DEFAULT_NAME;

const readOptionFromRecord = ({_id}) =>
  assembleOption(_id, _id, _id, false);
