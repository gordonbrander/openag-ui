/* @flow */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
Adapted from
https://github.com/browserhtml/browserhtml/blob/master/src/common/button.js
*/

import {merge, nofx, annotate} from "../common/prelude"
import {classed, toggle} from "../common/attr"
import {constant} from '../lang/functional';
import * as Unknown from "../common/unknown"
import * as Target from "../common/target"
import * as Focus from "../common/focusable"
import * as Control from "../common/control"
import * as Pointer from "../common/pointer"
import {html, Effects, forward} from "reflex"

export class Model {
  constructor(
    label,
    pointer,
    control,
    target,
    focus
  ) {
    this.label = label;
    this.pointer = pointer;
    this.control = control;
    this.target = target;
    this.focus = focus;
  }
}

const PointerAction = (action) => ({
  type: "Pointer",
  pointer: action
});

const TagPointer = action =>
  action.type === 'PointEnd' ?
  // Map PointEnd to click, making it interceptable by parent
  Click :
  PointerAction(action);

const TagTarget = (action) => ({
  type: "Target",
  target: action
});

const TagFocus = (action) => ({
  type: "Focus",
  focus: action
});

const TagControl = (action) => ({
  type: "Control",
  control: action
});

export const Click = {type: 'Click'};
export const Disable = TagControl(Control.Disable);
export const Enable = TagControl(Control.Enable);
export const Activate = TagFocus(Focus.Focus);
export const Deactivate = TagFocus(Focus.Blur);
export const Over = TagTarget(Target.Over);
export const Out = TagTarget(Target.Out);

export const init = (
  label,
  isPointerDown,
  isDisabled,
  isPointerOver,
  isFocused
) => assemble(
  label,
  Pointer.init(isPointerDown),
  Control.init(isDisabled),
  Target.init(isPointerOver),
  Focus.init(isFocused)
);

const assemble = (
  label,
  [pointer, pointerFx],
  [control, controlFx],
  [target, targetFx],
  [focus, focusFx]
) => [
  new Model(
    label,
    pointer,
    control,
    target,
    focus
  ),
  Effects.batch([
    pointerFx.map(TagPointer),
    controlFx.map(TagControl),
    targetFx.map(TagTarget),
    focusFx.map(TagFocus)
  ])
];


export const update = (model, action) => {
  switch (action.type) {
    case "Click":
      return delegatePointerUpdate(model, Pointer.PointEnd);
    case "Pointer":
      return delegatePointerUpdate(model, action.pointer)
    case "Control":
      return delegateControlUpdate(model, action.control)
    case "Target":
      return delegateTargetUpdate(model, action.target)
    case "Focus":
      return delegateFocusUpdate(model, action.focus)
    default:
      return Unknown.update(model, action)
  }
}

const delegatePointerUpdate = (model, action) =>
  swapPointer(model, Pointer.update(model.pointer, action));

const swapPointer = (model, [pointer, fx]) => [
  new Model(
    model.label,
    pointer,
    model.control,
    model.target,
    model.focus
  ),
  fx.map(TagPointer)
];

const delegateControlUpdate = (model, action) =>
  swapControl(model, Control.update(model.control, action));

const swapControl = (model, [control, fx]) => [
  new Model(
    model.label,
    model.pointer,
    control,
    model.target,
    model.focus
  ),
  fx.map(TagControl)
];

const delegateTargetUpdate = (model, action) =>
  swapTarget(model, Target.update(model.target, action));

const swapTarget = (model, [target, fx]) => [
  new Model(
    model.label,
    model.pointer,
    model.control,
    target,
    model.focus
  ),
  fx.map(TagTarget)
];


const delegateFocusUpdate = (model, action) =>
  swapFocus(model, Focus.update(model.focus, action));

const swapFocus = (model, [focus, fx]) => [
  new Model(
    model.label,
    model.pointer,
    model.control,
    model.target,
    focus
  ),
  fx.map(TagFocus)
];

export const view = (model, address, className) =>
  html.button({
    className: classed({
      'button': true,
      'button--down': model.pointer.isDown,
      [className]: true
    }),
    disabled: toggle('disabled', model.control.isDisabled),
    onFocus: onFocus(address),
    onBlur: onBlur(address),
    onMouseOver: onMouseOver(address),
    onMouseOut: onMouseOut(address),
    onMouseDown: onMouseDown(address),
    onMouseUp: onMouseUp(address),
    onTouchStart: onTouchStart(address),
    onTouchEnd: onTouchEnd(address)
  }, [
    model.label
  ]);

const preventDefault = decode => event => {
  event.preventDefault();
  return decode(event);
}

export const onFocus = annotate(Focus.onFocus, TagFocus);
export const onBlur = annotate(Focus.onBlur, TagFocus);
export const onMouseOver = annotate(Target.onMouseOver, TagTarget);
export const onMouseOut = annotate(Target.onMouseOut, TagTarget);
export const onMouseDown = annotate(Pointer.onMouseDown, TagPointer);
export const onMouseUp = annotate(Pointer.onMouseUp, TagPointer);
export const onTouchStart = annotate(Pointer.onTouchStart, TagPointer);
export const onTouchEnd = annotate(Pointer.onTouchEnd, TagPointer);