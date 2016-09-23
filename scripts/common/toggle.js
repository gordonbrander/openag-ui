/*
A thumb toggle-style control for forms.
*/
import {html, forward, Effects, thunk} from 'reflex';
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

export const view = (model, address, className) =>
  html.div({
    id: model.id,
    className
  }, [
    html.input({
      type: 'checkbox',
      checked: (
        model.isActivated ?
        'checked' :
        // void(0) ensures that the property is never added to the object.
        void(0)
      ),
      onChange: event => address(decodeChange(event))
    }),
    html.label({
      'for': model.id
    })
  ]);

const decodeChange = event => Change(event.target.checked);