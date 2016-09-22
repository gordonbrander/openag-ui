import {html, forward, Effects} from 'reflex';
import {compose} from '../lang/functional';
import {tag, tagged, annotate} from '../common/prelude';
import {update as updateUnknown} from '../common/unknown';
import * as Focus from '../common/focusable';
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

const FocusAction = (action) => ({
  type: "Focus",
  focus: action
});

const ControlAction = action => ({
  type: "Control",
  control: action
});

// Update, init

export class Model {
  constructor(
    focus,
    control,
    value,
    min,
    max,
    step
  ) {
    this.focus = focus
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
  isFocused = false,
  isDisabled = false
) => {
  const [focus, focusFx] = Focus.init(isFocused);
  const [control, controlFx] = Control.init(isDisabled);

  const model = new Model(
    focus,
    control,
    value,
    min,
    max,
    step
  );

  return [
    model,
    Effects.batch([
      focusFx,
      controlFx
    ])
  ]
}

export const update = (model, action) => {
  switch (action.type) {
    case 'Change':
      return change(model, action.value)
    case 'Focus':
      return delegateFocusUpdate(model, action.focus)
    case 'Control':
      return delegateControlUpdate(model, action.control)
    default:
      return updateUnknown(model, action)
  }
}

const change = (model, value) => [
  new Model(
    model.focus,
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
  new Model(model.focus, control, model.value, model.min, model.max, model.step),
  fx.map(ControlAction)
];

const delegateFocusUpdate = (model, action) =>
  swapFocus(model, Focus.update(model.focus, action));

const swapFocus = (model, [focus, fx]) => [
  new Model(focus, model.control, model.value, model.min, model.max, model.step),
  fx.map(FocusAction)
];

// View

export const view = (model, address, className) =>
  html.input({
    className,
    type: 'range',
    min: model.min,
    max: model.max,
    value: model.desired,
    step: model.step,
    disabled:
      ( model.control.isDisabled
      ? true
      : void(0)
      ),
    onChange: event => address(decodeChangeEvent(event)),
    onFocus: onFocus(address),
    onBlur: onBlur(address)
  });

export const decodeChangeEvent = (event) => {
  const number = Number.parseFloat(event.target.value);
  return Change(number);
}
export const onFocus = annotate(Focus.onFocus, FocusAction);
export const onBlur = annotate(Focus.onBlur, FocusAction);