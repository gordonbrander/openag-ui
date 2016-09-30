/*
An error banner for notifying the user of edge-case conditions.
*/
import {html, Effects, Task, forward} from 'reflex';
import {localize} from '../common/lang';
import {port} from '../common/prelude';
import {classed} from '../common/attr';
import * as Unknown from '../common/unknown';

// Default timeout for banner before it hides itself.
// (only applies in some situations)
const TIMEOUT = 8000;

// Actions

const isWarning = true;

// Notify the user that something good/expected/benign happened.
export const Notify = message => ({
  type: 'Notify',
  message
});

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

const AlwaySuppress = () => Suppress;

// Update, model, init
const SHOW = 'show';
const REFRESHABLE = 'refreshable';
const DISMISSABLE = 'dismissable';
const HIDE = 'hide';

export class Model {
  constructor(mode, message, isWarning) {
    this.mode = mode;
    this.message = message;
    this.isWarning = isWarning;
  }
}

export const init = () => [
  new Model(HIDE, '', isWarning),
  Effects.none
];

export const update = (model, action) =>
  action.type === 'Alert' ?
  showAlert(model, action.message) :
  action.type === 'AlertRefreshable' ?
  alertRefreshable(model, action.message) :
  action.type === 'AlertDismissable' ?
  alertDismissable(model, action.message) :
  action.type === 'Notify' ?
  notify(model, action.message) :
  action.type === 'Suppress' ?
  suppress(model) :
  Unknown.update(model, action);

const showAlert = (model, message) => [
  (
    (model.mode !== SHOW || model.message !== message) ?
    new Model(SHOW, message, isWarning) :
    model
  ),
  // After the timeout, hide banner
  Effects.perform(Task.sleep(TIMEOUT)).map(AlwaySuppress)
];

const alertRefreshable = (model, message) => [
  (
    (model.mode !== REFRESHABLE || model.message !== message) ?
    new Model(REFRESHABLE, message, isWarning) :
    model
  ),
  Effects.none
];

const alertDismissable = (model, message) => [
  (
    (model.mode !== DISMISSABLE || model.message !== message) ?
    new Model(DISMISSABLE, message, isWarning) :
    model
  ),
  // After the timeout, hide banner
  Effects.perform(Task.sleep(TIMEOUT)).map(AlwaySuppress)
];

const notify = (model, message) => [
  new Model(DISMISSABLE, message, !isWarning),
  // After the timeout, hide banner
  Effects.perform(Task.sleep(TIMEOUT)).map(AlwaySuppress)
];

const suppress = model => [
  new Model(HIDE, model.message, model.isWarning),
  Effects.none
];

// View

export const view = (model, address, className) => {
  const sendClose = onClose(address);

  return html.div({
    className: classed({
      'banner': true,
      'banner--notification': !model.isWarning,
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
      onTouchStart: sendClose,
      onMouseDown: sendClose
    }, [
      localize('Close')
    ]),
    html.a({
      className: classed({
        'banner-action': true,
        'banner-action--refresh': true,
        'banner-action--close': model.mode !== REFRESHABLE
      }),
      onTouchStart: onRefresh,
      onMouseDown: onRefresh
    }, [
      localize('Refresh')
    ])
  ]);
}

export const onClose = port(event => {
  event.preventDefault();
  return Suppress;
});

const onRefresh = event => {
  event.preventDefault();
  // Refresh and flip boolean to bypass page cache.
  document.location.reload(true);
};