// Helper functions for showing and hiding model components.
import {Effects} from 'reflex';
import {merge, port} from '../common/prelude';
import * as Unknown from '../common/unknown';

export const Open = {
  type: 'Open'
};

export const Close = {
  type: 'Close'
};

export const open = model =>
  update(model, Open);

export const close = model =>
  update(model, Close);

export const update = (model, action) =>
  action.type === 'Open' ?
  [merge(model, {isOpen: true}), Effects.none] :
  action.type === 'Close' ?
  [merge(model, {isOpen: false}), Effects.none] :
  Unknown.update(model, action);

export const onOpen = port(event => {
  event.preventDefault();
  return Open;
});

export const onClose = port(event => {
  event.preventDefault();
  return Close;
})