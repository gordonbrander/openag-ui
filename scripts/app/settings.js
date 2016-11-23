import {app as APP} from '../../openag-config.json';
import {html, Effects, Task} from 'reflex';
import PouchDB from 'pouchdb-browser';
import {merge} from '../common/prelude';
import {cursor} from '../common/cursor';
import * as Modal from '../common/modal';
import {update as updateUnknown} from '../common/unknown';
import {classed} from '../common/attr';
import {localize} from '../common/lang';

// Actions

export const ResetApp = {
  type: 'ResetApp'
};

export const RefreshApp = {type: 'RefreshApp'};
const AlwaysRefresh = () => RefreshApp;

const NoOp = {type: 'NoOp'};

export const TagModal = (action) => ({
  type: 'Modal',
  source: action
});

export const Open = TagModal(Modal.Open);
export const Close = TagModal(Modal.Close);
export const Toggle = TagModal(Modal.Toggle);

// Init, update

export const init = () => {
  const next = {
    isOpen: false
  }

  return [next, Effects.none];
}

export const update = (model, action) =>
  action.type === 'Modal' ?
  updateModal(model, action.source) :
  action.type === 'ResetApp' ?
  resetApp(model) :
  action.type === 'RefreshApp' ?
  refreshApp(model) :
  action.type === 'NoOp' ?
  [model, Effects.none] :
  updateUnknown(model, action);

const updateModal = cursor({
  get: model => model,
  set: (model, patch) => merge(model, patch),
  update: Modal.update,
  tag: TagModal
});

const resetApp = model => {
  const task = new Task(succeed => {
    // Create a pouchDB instance (the database already exists, but we need
    // an interface to it that will kill it).
    const db = new PouchDB(APP.local);
    db.destroy().then(succeed);
  });
  // Map task to refresh action. When db finishes deleting, it will trigger
  // an app refresh.
  const fx = Effects.perform(task).map(AlwaysRefresh);
  return [model, fx];
}

const refreshApp = (model) => {
  const task = new Task(succeed => {
    document.location.reload(true);
    succeed(NoOp);
  });
  return [model, Effects.perform(task)];
}

// View

export const view = (model, address) =>
  html.div({
    className: classed({
      'dropdown': true,
      'dropdown--close': !model.isOpen
    }),
    hidden: (
      !model.isOpen ?
      'hidden' :
      void(0)
    )
  }, [
    html.div({
      className: 'dropdown-overlay',
      onClick: () => address(Close)
    }),
    html.div({
      className: 'dropdown-main',
      style: {
        top: '66px',
        right: '12px'
      }
    }, [
      html.ul({
        className: 'menu-list'
      }, [
        html.li(null, [
          html.a({
            className: 'menu-list--destructive',
            onClick: (event) => {
              event.preventDefault();
              address(ResetApp)
            }
          }, [
            'Reset App'
          ])
        ])
      ])
    ])
  ]);