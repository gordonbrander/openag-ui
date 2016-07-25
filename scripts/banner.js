/*
An error banner for notifying the user of edge-case conditions.
*/
import {html, Effects, forward} from 'reflex';
import {tag, batch} from './common/prelude';
import * as ClassName from './common/classname';
import * as Unknown from './common/unknown';

// Actions

export const ModalAction = tag('Modal');

export const Open = {type: 'Open'};
export const Close = {type: 'Close'};
export const Alert = tag('Alert');

// Update, model, init

export const Model = (isOpen, message) => ({
  isOpen,
  message
});

// Convenient update functions for model
const open = model => Model(true, model.message);
const close = model => Model(close, model.message);

export const init = () => [
  Model(true, 'There seems to be a problem with your computer'),
  Effects.none
];

export const update = (model, action) =>
  action.type === 'Alert' ?
  [Model(true, action.source), Effects.none] :
  action.type === 'Open' ?
  [open(model), Effects.none] :
  action.type === 'Close' ?
  [close(model), Effects.none] :
  Unknown.update(model, action);

// View

export const view = (model, address) =>
  html.div({
    className: ClassName.create({
      'banner': true,
      'banner--close': !model.isOpen
    })
  }, [
    html.div({
      className: 'banner--text'
    }, [
      model.message
    ])
  ]);