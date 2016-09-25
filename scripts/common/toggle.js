/*
A thumb toggle-style control for forms.
*/
import {html, forward, Effects, thunk} from 'reflex';
import {classed} from '../common/attr';
import {update as updateUnknown} from '../common/unknown';

// Actions

export const Change = isActivated => ({
  type: 'Change',
  isActivated
});

// Init, update

export class Model {
  constructor(id, isActivated) {
    this.id = id;
    this.isActivated = isActivated;
  }
}

export const init = (isActivated) => [
  new Model(isActivated),
  Effects.none
];

export const update = (model, action) =>
  action.type === 'Change' ?
  change(model, action.isActivated) :
  updateUnknown(model, action);

const change = (model, isActivated) => [
  new Model(model.id, isActivated),
  Effects.none
];

// View

export const view = (model, address) =>
  // @TODO there is a bug with rendering the "for" attribute on labels that
  // is forcing us to fake checkboxes this way. In future, we should figure out
  // if the bug is in Reflex or virtual-dom, fix and implement this with
  // input[type=checkbox].
  html.div({
    id: model.id,
    className: classed({
      'toggle': true,
      'toggle--checked': model.isActivated
    }),
    onClick: event => {
      event.preventDefault();
      address(Change(!model.isActivated));
    }
  });