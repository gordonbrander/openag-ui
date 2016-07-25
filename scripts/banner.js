/*
An error banner for notifying the user of edge-case conditions.
*/
import * as Lang from './common/lang';
import {html, Effects, forward} from 'reflex';
import {tag} from './common/prelude';
import * as ClassName from './common/classname';
import * as Unknown from './common/unknown';

// Actions

export const Open = {type: 'Open'};
export const Close = {type: 'Close'};
export const Alert = tag('Alert');
export const AlertWithRefresh = tag('AlertWithRefresh');

// Update, model, init

export const Model = (isOpen, isRefresh, message) => ({
  isOpen,
  isRefresh,
  message
});

// Convenient update functions for model
const open = model => Model(true, model.isRefresh, model.message);
const close = model => Model(false, model.isRefresh, model.message);

export const init = () => [
  Model(false, false, ''),
  Effects.none
];

export const update = (model, action) =>
  action.type === 'Alert' ?
  [Model(true, false, action.source), Effects.none] :
  action.type === 'AlertWithRefresh' ?
  [Model(true, true, action.source), Effects.none] :
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
    ]),
    html.a({
      className: ClassName.create({
        'banner--refresh': true,
        'banner--refresh-close': !model.isRefresh
      }),
      onClick: event => {
        event.preventDefault();
        // Refresh and flip boolean to bypass page cache.
        document.location.reload(true);
      }
    }, [
      Lang.localize('Refresh')
    ])
  ]);