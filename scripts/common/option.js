import {html, Effects} from 'reflex';
import * as Control from '../common/control';
import {toggle} from '../common/attr';
import {update as updateUnknown} from '../common/unknown';

// Actions

const TagControl = action => ({
  type: "Control",
  control: action
});

// Model

export class Model {
  constructor(
    id,
    text,
    value,
    control
  ) {
    this.id = id
    this.text = text
    this.value = value
    this.control = control
  }
}

export const assemble = (id, text, value, isDisabled) => new Model(
  id,
  (text != null ? text : id),
  (value != null ? value : id),
  isDisabled ? Control.Model.disabled : Control.Model.enabled
);

export const update = (model, action) => {
  switch(action.type) {
    case 'Control' :
      return delegateControlUpdate(model, action.control)
    default:
      return updateUnknown(model, action)
  }
}

const delegateControlUpdate = (model, action) =>
  swapControl(model, Control.update(model.control, action));

const swapControl = (model, [control, fx]) => [
  new Model(model.id, model.text, model.value, control),
  fx.map(TagControl)
];

// View

export const view = (model) =>
  html.option({
    disabled: toggle('disabled', model.control.isDisabled),
    value: model.value
  }, [
    model.text
  ]);

// Helpers

export const readValue = option => option.value;