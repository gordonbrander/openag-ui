import {html, forward, Effects} from 'reflex';
import {merge, tagged, tag} from './common/prelude';
import * as Unknown from './common/unknown';

export const Open = {
  type: 'Open'
};

export const Close = {
  type: 'Close'
};

export const Click = {
  type: 'Click'
};

export const init = () => [
  {isOpen: false},
  Effects.none
];

export const update = (model, action) =>
  action.type === 'Open' ?
  [merge(model, {isOpen: true}), Effects.none] :
  action.type === 'Close' ?
  [merge(model, {isOpen: false}), Effects.none] :
  Unknown.update(model, action);

const nil = void(0);

export const view = (model, address) =>
  html.div({
    className: 'ovr-overlay',
    hidden: !model.isOpen ? 'hidden' : nil,
    onClick: () => address(Click)
  });
