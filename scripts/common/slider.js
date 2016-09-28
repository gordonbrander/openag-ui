import {html, forward, Effects, Task} from 'reflex';
import {compose, constant} from '../lang/functional';
import {annotate, port} from '../common/prelude';
import {update as updateUnknown} from '../common/unknown';
import * as Edit from '../common/editable';
import * as Control from '../common/control';

// Actions

export const Change = value => ({
  type: 'Change',
  value
});

const EditAction = (action) => ({
  type: "Edit",
  edit: action
});

const ControlAction = action => ({
  type: "Control",
  control: action
});

// Update, init

export class Model {
  constructor(
    control,
    value,
    min,
    max,
    step
  ) {
    this.control = control
    this.value = value
    this.min = min
    this.max = max
    this.step = step
  }
}

export const init = (
  value,
  min,
  max,
  step,
  isDisabled = false
) => {
  const [control, controlFx] = Control.init(isDisabled);

  const model = new Model(
    control,
    value,
    min,
    max,
    step
  );

  return [
    model,
    controlFx.map(ControlAction)
  ]
}

export const update = (model, action) => {
  switch (action.type) {
    case 'Change':
      return change(model, action.value)
    case 'Control':
      return delegateControlUpdate(model, action.control)
    default:
      return updateUnknown(model, action)
  }
}

const change = (model, value) => [
  new Model(
    model.control,
    value,
    model.min,
    model.max,
    model.step
  ),
  Effects.none
];

export const enable = (model) =>
  delegateControlUpdate(model, Control.Enable);

export const disable = (model) =>
  delegateControlUpdate(model, Control.Disable);

const delegateControlUpdate = (model, action) =>
  swapControl(model, Control.update(model.control, action));

const swapControl = (model, [control, fx]) => [
  new Model(control, model.value, model.min, model.max, model.step),
  fx.map(ControlAction)
];

// View

export const view = (model, address, className) =>
  html.input({
    className,
    type: 'range',
    min: model.min,
    max: model.max,
    value: model.value,
    step: model.step,
    disabled:
      ( model.control.isDisabled
      ? true
      : void(0)
      ),
    onChange: event => {
      event.preventDefault();
      address(decodeChangeEvent(event));
    }
  });

export const decodeChangeEvent = (event) => {
  const number = Number.parseFloat(event.target.value);
  return Change(number);
}