import {html, forward, Effects, thunk} from 'reflex';
import {merge} from '../common/prelude';
import {cursor} from '../common/cursor';
import * as Modal from '../common/modal';
import {unknown as updateUnknown} from '../common/unknown';
import {classed} from '../common/attr';
import {localize} from '../common/lang';

// Actions

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
  updateUnknown(model, action);

const updateModal = cursor({
  get: model => model,
  set: (model, patch) => merge(model, patch),
  update: Modal.update,
  tag: TagModal
});

// View

export const view = (model, address) =>
  html.div({
    className: classed({
      'settings': true,
      'settings--closed': !model.isOpen
    })
  }, [
    html.div({
      className: 'settings-modal modal-overlay',
      onClick: () => address(Close)
    }),
    html.div({
      className: 'settings-main'
    }, [
      'hello'
    ])
  ])