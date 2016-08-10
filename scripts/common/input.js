/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Adapted from
https://github.com/browserhtml/browserhtml/blob/master/src/common/text-input.js
*/

import {html, forward, Effects} from 'reflex';
import {compose} from '../lang/functional';
import {tag, tagged, annotate} from '../common/prelude';
import * as Unknown from '../common/unknown';
import * as Focus from '../common/focusable';
import * as Edit from '../common/editable';
import * as Control from '../common/control';

export class Model {
  constructor(
    edit,
    focus,
    control,
    placeholder
  ) {
    this.edit = edit
    this.focus = focus
    this.control = control
    this.placeholder = placeholder
  }
}

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

export const Change = (value, selection) => EditAction(Edit.Change(Edit.readChange(value, selection)));
export const Activate = FocusAction(Focus.Focus);
export const Deactivate = FocusAction(Focus.Blur);
export const Enable = ControlAction(Control.Enable);
export const Disable = ControlAction(Control.Disable);

export const init = (
  value = '',
  selection = null,
  placeholder = '',
  isDisabled,
  isFocused = false
) => {
  const [edit, editFx] = Edit.init(value, selection);
  const [control, controlFx] = Control.init(isDisabled);
  const [focus, focusFx] = Focus.init(isFocused);
  const model = new Model(
    edit,
    focus,
    control,
    placeholder
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

const delegateEditUpdate = (model, action) =>
  swapEdit(model, Edit.update(model.edit, action));

const delegateFocusUpdate = (model, action) =>
  swapFocus(model, Focus.update(model.focus, action));

const delegateControlUpdate = (model, action) =>
  swapControl(model, Control.update(model.control, action));

const swapEdit = (model, [edit, fx]) => [
  new Model(edit, model.focus, model.control, model.placeholder),
  fx.map(EditAction)
];

const swapFocus = (model, [focus, fx]) => [
  new Model(model.edit, focus, model.control, model.placeholder),
  fx.map(FocusAction)
];

const swapControl = (model, [control, fx]) => [
  new Model(model.edit, model.focus, control, model.placeholder),
  fx.map(ControlAction)
];

export const view = (model, address, className) =>
  html.input({
    className,
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
    onBlur: onBlur(address)
  });

export const onChange = annotate(Edit.onChange, EditAction);
export const onSelect = annotate(Edit.onSelect, EditAction);
export const onFocus = annotate(Focus.onFocus, FocusAction);
export const onBlur = annotate(Focus.onBlur, FocusAction);
