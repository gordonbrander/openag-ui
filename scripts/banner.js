/*
An error banner for notifying the user of edge-case conditions.
*/
import * as Lang from './common/lang';
import {html, Effects, forward} from 'reflex';
import {tag} from './common/prelude';
import * as ClassName from './common/classname';
import * as Unknown from './common/unknown';

// Actions

// Turn on banner with message
export const Alert = tag('Alert');
// Turn on banner with message and refresh button
export const AlertWithRefresh = tag('AlertWithRefresh');
// Turn off banner, clear message
export const Suppress = {type: 'Suppress'};

// Update, model, init

export const Model = (isRefresh, message) => ({
  isRefresh,
  message
});

// Convenient update functions for model
const suppress = model => Model(model.isRefresh, '');

export const init = () => [
  Model(false, ''),
  Effects.none
];

export const update = (model, action) =>
  action.type === 'Alert' ?
  [Model(false, action.source), Effects.none] :
  action.type === 'AlertWithRefresh' ?
  [Model(true, action.source), Effects.none] :
  action.type === 'Suppress' ?
  [suppress(model), Effects.none] :
  Unknown.update(model, action);

// View

export const view = (model, address) =>
  html.div({
    className: ClassName.create({
      'banner': true,
      // Hide banner if there is no message to show
      'banner--close': model.message === ''
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