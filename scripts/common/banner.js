/*
An error banner for notifying the user of edge-case conditions.
*/
import {html, Effects, forward} from 'reflex';
import * as Lang from '../common/lang';
import {tag, nofx} from '../common/prelude';
import {classed} from '../common/attr';
import * as Unknown from '../common/unknown';

// Actions

// Turn on banner with message
export const Alert = message => ({
  type: 'Alert',
  message
});

// Turn on banner with message
export const AlertDismissable = message => ({
  type: 'AlertDismissable',
  message
});

// Turn on banner with message and refresh button
export const AlertRefreshable = message => ({
  type: 'AlertRefreshable',
  message
});

// Turn off banner, clear message
export const Suppress = {type: 'Suppress'};

// Update, model, init
const SHOW = 'show';
const REFRESHABLE = 'refreshable';
const DISMISSABLE = 'dismissable';
const HIDE = 'hide';

export const Model = (mode, message) => ({
  mode,
  message
});

const swapShow = (model, message) =>
  (model.mode !== SHOW || model.message !== message) ?
  Model(SHOW, message) :
  model;

const swapRefreshable = (model, message) =>
  (model.mode !== REFRESHABLE || model.message !== message) ?
  Model(REFRESHABLE, message) :
  model;

const swapDismissable = (model, message) =>
  (model.mode !== DISMISSABLE || model.message !== message) ?
  Model(DISMISSABLE, message) :
  model;

// Convenient update functions for model
const swapSuppress = model =>
  model.mode !== HIDE ? Model(HIDE, '') : model;

export const init = () => [
  Model(HIDE, ''),
  Effects.none
];

export const update = (model, action) =>
  action.type === 'Alert' ?
  nofx(swapShow(model, action.message)) :
  action.type === 'AlertRefreshable' ?
  nofx(swapRefreshable(model, action.message)) :
  action.type === 'AlertDismissable' ?
  nofx(swapDismissable(model, action.message)) :
  action.type === 'Suppress' ?
  nofx(swapSuppress(model)) :
  Unknown.update(model, action);

// View

export const view = (model, address, className) =>
  html.div({
    className: classed({
      'banner': true,
      // Hide banner if there is no message to show
      'banner--close': model.mode === HIDE,
      [className]: true
    })
  }, [
    html.div({
      className: 'banner--text'
    }, [
      model.message
    ]),
    html.a({
      className: classed({
        'banner-action': true,
        'banner-action--dismiss': true,
        'banner-action--close': model.mode !== DISMISSABLE
      }),
      onClick: event => {
        event.preventDefault();
        address(Suppress);
      }
    }, [
      Lang.localize('Close')
    ]),
    html.a({
      className: classed({
        'banner-action': true,
        'banner-action--refresh': true,
        'banner-action--close': model.mode !== REFRESHABLE
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