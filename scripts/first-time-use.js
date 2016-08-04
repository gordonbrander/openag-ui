/*
This module provides the "First Time Use" experience for the app.

We need a few important details for the app to function -- IP address or web
address of the Food Computer, that kind of thing. If we don't have that info,
we prompt the user to go through the FTU. This should only happen once. The
information is stored in the browser's local storage via PouchDB.

Includes settings (like IP address of app) and, in future, log-in creds.
*/
import {html, Effects, forward} from 'reflex';
import * as Input from './common/input';
import * as Modal from './common/modal';
import {tag, merge} from './common/prelude';
import {classed, toggle} from './common/attr';
import {cursor} from './common/cursor';
import {localize} from './common/lang';
import * as Unknown from './common/unknown';

// Actions

const TagModal = tag('Modal');

export const Open = TagModal(Modal.Open);
export const Close = TagModal(Modal.Close);

const TagAddress = tag('Address');

// Model and update

export const init = () => {
  const host = window.location.host;
  const [address, addressFx] = Input.init(host, null, localize('Web or IP address...'));
  
  return [
    {
      isOpen: false,
      address
    },
    Effects.batch([
      addressFx.map(TagAddress)
    ])
  ];
}

export const update = (model, action) =>
  action.type === 'Modal' ?
  updateModal(model, action.source) :
  action.type === 'Address' ?
  updateAddress(model, action.source) :
  Unknown.update(model, action);

const updateModal = cursor({
  update: Modal.update,
  tag: TagModal
});

const updateAddress = cursor({
  get: model => model.address,
  set: (model, address) => merge(model, {address}),
  update: Input.update,
  tag: TagAddress
});

// View

export const viewFTU = (model, address) =>
  html.div({
    className: 'ftu scene',
    hidden: toggle(!model.isOpen, 'hidden')
  }, [
    viewAddress(model.address, forward(address, TagAddress))
  ]);

const viewAddress = Input.view('input ftu-address');