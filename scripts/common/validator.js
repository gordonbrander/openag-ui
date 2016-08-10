/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Adapted from
https://github.com/browserhtml/browserhtml/blob/master/src/common/text-input.js
*/

import {html, forward, Effects} from 'reflex';
import {compose} from '../lang/functional';
import {tag, tagged, annotate, nofx} from '../common/prelude';
import {toggle, classed} from '../common/attr';
import * as Unknown from '../common/unknown';
import * as Focus from '../common/focusable';
import * as Edit from '../common/editable';
import * as Control from '../common/control';

const RESTING = 'resting';
const OK = 'ok';
const ERROR = 'error';
const VALIDATING = 'validating';

export class Model {
  constructor(
    label,
    message,
    placeholder,
    mode,
    edit,
    focus,
    control
  ) {
    this.edit = edit;
    this.focus = focus;
    this.control = control;
    this.placeholder = placeholder;
    this.mode = mode;
    this.label = label;
    this.message = message;
  }
}

const Blur = {type: 'Blur'};

export const Rest = {type: 'Rest'};

const Validating = {type: 'Validating'};

export const Validate = value => ({
  type: 'Validate',
  value
});

export const Ok = message => ({
  type: 'Ok',
  message
});

export const Error = message => ({
  type: 'Error',
  message
});

const EditAction = (action) =>
  action.type === 'Change' ?
  Change(action.change) :
  ({
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

const Change = change => ({
  type: 'EditChange',
  change
});

const EditChange = (change) => EditAction(Edit.Change(change));
export const Activate = FocusAction(Focus.Focus);
export const Deactivate = FocusAction(Focus.Blur);
export const Enable = ControlAction(Control.Enable);
export const Disable = ControlAction(Control.Disable);

export const init = (
  value = '',
  label,
  placeholder = '',
  selection = null,
  isDisabled = false,
  isFocused = false
) => {
  const [edit, editFx] = Edit.init(value, selection);
  const [control, controlFx] = Control.init(isDisabled);
  const [focus, focusFx] = Focus.init(isFocused);
  const model = new Model(
    label,
    '',
    placeholder,
    RESTING,
    edit,
    focus,
    control
  );

  const fx = Effects.batch([
    editFx.map(EditAction),
    focusFx.map(FocusAction),
    controlFx.map(ControlAction)
  ]);

  return [model, fx];
}

export const update = (model, action) => {
  switch (action.type) {
    case 'Edit':
      return delegateEditUpdate(model, action.edit)
    case 'Focus':
      return delegateFocusUpdate(model, action.focus)
    case 'Control':
      return delegateControlUpdate(model, action.control)
    case 'Blur':
      return updateBlur(model)
    case 'EditChange':
      return updateChange(model, action.change)
    case 'Ok':
      return nofx(changeMode(model, OK, action.message))
    case 'Error':
      return nofx(changeMode(model, ERROR, action.message))
    case 'Rest':
      return nofx(changeMode(model, RESTING, ''))
    case 'Validating':
      return sendValidate(model)
    default:
      return Unknown.update(model, action)
  }
};

export const enable = (model) =>
  delegateControlUpdate(model, Control.Enable);

export const disable = (model) =>
  delegateControlUpdate(model, Control.Disable);

export const edit = (model, value, selection) =>
  swapEdit(model, Edit.change(model.edit, value, selection));

const blur = model =>
  delegateFocusUpdate(model, Focus.Blur);

const delegateEditUpdate = (model, action) =>
  swapEdit(model, Edit.update(model.edit, action));

const delegateFocusUpdate = (model, action) =>
  swapFocus(model, Focus.update(model.focus, action));

const delegateControlUpdate = (model, action) =>
  swapControl(model, Control.update(model.control, action));

const swapEdit = (model, [edit, fx]) => [
  new Model(model.label, model.message, model.placeholder, model.mode, edit, model.focus, model.control),
  fx.map(EditAction)
];

const swapFocus = (model, [focus, fx]) => [
  new Model(model.label, model.message, model.placeholder, model.mode, model.edit, focus, model.control),
  fx.map(FocusAction)
];

const swapControl = (model, [control, fx]) => [
  new Model(model.label, model.message, model.placeholder, model.mode, model.edit, model.focus, control),
  fx.map(ControlAction)
];

const changeMode = (model, mode, message) =>
  model.mode !== mode || model.message !== message ?
  new Model(model.label, message, model.placeholder, mode, model.edit, model.focus, model.control)
  : model;

// Transition to validating mode and send up a "Validate" action.
const sendValidate = model => [
  changeMode(model, VALIDATING, ''),
  Effects.receive(Validate(readValue(model)))
];

const updateBlur = model => {
  const [next, fx] = blur(model);

  const modeAction = (
    model.edit.value === '' ?
    Rest :
    Validating
  );

  return [
    next,
    Effects.batch([
      fx,
      Effects.receive(modeAction)
    ])
  ];
}

const updateChange = (model, change) => {
  const [changed, changedFx] = delegateEditUpdate(model, Edit.Change(change));
  const [rested, restedFx] = update(changed, Rest);
  return [
    rested,
    Effects.batch([
      changedFx,
      Effects.receive(Rest)
    ])
  ];
}

export const view = (model, address, className) =>
  html.div({
    className: classed({
      [className]: true,
      'validator': true,
      'validator-ok': model.mode === OK,
      'validator-error': model.mode === ERROR,
      'validator-validating': model.mode === VALIDATING
    })
  }, [
    html.input({
      className: 'validator-input input',
      type: 'input',
      placeholder: model.placeholder,
      value: model.edit.value,
      disabled:
        ( model.control.isDisabled
        ? true
        : void(0)
        ),
      onInput: onChange(address),
      onKeyUp: onSelect(address),
      onSelect: onSelect(address),
      onFocus: onFocus(address),
      onBlur: () => address(Blur)
    }),
    html.div({
      className: 'validator-message'
    }, [
      model.message || model.label
    ])
  ]);

export const onFocus = annotate(Focus.onFocus, FocusAction);
export const onChange = annotate(Edit.onChange, EditAction);
export const onSelect = annotate(Edit.onSelect, EditAction);

// Determine if the validator is currently "ok" (valid).
// Returns a boolean.
export const isOk = model => model.mode === OK;

// Read current value of input.
// Returns a string.
export const readValue = model => model.edit.value;
