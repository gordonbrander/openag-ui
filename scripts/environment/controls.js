import {html, forward, Effects, thunk} from 'reflex';
import {update as updateUnknown} from '../common/unknown';
import {merge} from '../common/prelude';
import {localize} from '../common/lang';

// Actions

export const Configure = origin => ({
  type: 'Configure',
  origin
});

// Update, init

export const init = () => {
  const model = {
    origin: null
  };

  return [model, Effects.none];
}

export const update = (model, action) =>
  action.type === 'Configure' ?
  configure(model, action.origin) :
  updateUnknown(model, action);

const configure = (model, origin) => [
  merge(model, {origin}),
  Effects.none
];

// View

export const view = (model, address) =>
  html.div({});