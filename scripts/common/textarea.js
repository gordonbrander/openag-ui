/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Adapted from MPL code that can be found here:
https://github.com/browserhtml/browserhtml/blob/master/src/common/text-input.js
*/

import {html, forward, Effects} from 'reflex';
import {compose} from '../lang/functional';
import {tag, tagged, merge, always} from '../common/prelude';
import {cursor} from "../common/cursor"
import {toggle} from '../common/attr';
import * as Unknown from '../common/unknown';
import * as Focusable from '../common/focusable';
import * as Control from '../common/control';
import * as Editable from '../common/editable';

const Change = Editable.Change;
const EditableAction = tag('Editable');
const FocusableAction = tag('Focusable');

export const Clear = EditableAction(Editable.Clear);

export const init =
  (value = '', selection = null, placeholder = '', isDisabled = false)  => [
    {
      value,
      placeholder,
      selection,
      isDisabled,
      isFocused: false
    },
    Effects.none
  ];

const enable = model => [
  merge(model, {isDisabled: false}),
  Effects.none
];

const disable = model => [
  merge(model, {isDisabled: true}),
  Effects.none
];

const updateEditable = cursor({
  tag: EditableAction,
  update: Editable.update
});

const updateFocusable = cursor({
  tag: FocusableAction,
  update: Focusable.update
});

export const update = (model, action) =>
  action.type === 'Change' ?
  updateEditable(model, action) :
  action.type === 'Editable' ?
  updateEditable(model, action.source) :
  action.type === 'Focusable' ?
  updateFocusable(model, action.source) :
  action.type === 'Focus' ?
  updateFocusable(model, action) :
  action.type === 'Blur' ?
  updateFocusable(model, action) :
  action.type === 'Control' ?
  updateControl(model, action.source) :
  Unknown.update(model, action);

const decodeSelection = ({target}) => ({
  start: target.selectionStart,
  end: target.selectionEnd,
  direction: target.selectionDirection
});

const decodeChange = compose(
  EditableAction,
  event => Change(event.target.value, decodeSelection(event))
);

export const view = (id, className) => (model, address) =>
  html.textarea({
    id,
    className,
    type: 'input',
    placeholder: model.placeholder,
    value: model.value,
    disabled: toggle(model.isDisabled, true),
    onInput: event => address(decodeChange(event)),
  }, [
    model.value
  ]);
