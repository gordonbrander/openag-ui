/* @flow */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
Adapted from
https://github.com/browserhtml/browserhtml/blob/master/src/common/button.js
*/

import {merge, nofx} from "../common/prelude"
import {classed, toggle} from "../common/attr"
import * as Unknown from "../common/unknown"
import * as Target from "../common/target"
import * as Focus from "../common/focusable"
import * as Control from "../common/control"
import {html, Effects, forward} from "reflex"

export class Model {
  constructor(
    label,
    isActive,
    control,
    target,
    focus
  ) {
    this.label = label;
    this.isActive = isActive;
    this.control = control;
    this.target = target;
    this.focus = focus;
  }
}

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

export const Down = {type: "Down"};
export const Click = {type: "Click"};
export const Up = {type: "Up"};
export const Disable = TagControl(Control.Disable);
export const Enable = TagControl(Control.Enable);
export const Activate = TagFocus(Focus.Focus);
export const Deactivate = TagFocus(Focus.Blur);
export const Over = TagTarget(Target.Over);
export const Out = TagTarget(Target.Out);

export const init = (
  label,
  isActive,
  isDisabled,
  isPointerOver,
  isFocused
) => assemble(
  label,
  isActive,
  Control.init(isDisabled),
  Target.init(isPointerOver),
  Focus.init(isFocused)
);

const assemble = (
  label,
  isActive,
  [control, controlFx],
  [target, targetFx],
  [focus, focusFx]
) => [
  new Model(
    label,
    isActive,
    control,
    target,
    focus
  ),
  Effects.batch([
    controlFx.map(TagControl),
    targetFx.map(TagTarget),
    focusFx.map(TagFocus)
  ])
];


export const update = (model, action) => {
  switch (action.type) {
    case "Down":
      return down(model)
    case "Up":
      return up(model)
    case "Click":
      return press(model)
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

export const down = (model) => nofx(new Model(
  model.label,
  true,
  model.control,
  model.target,
  model.focus
));

export const up = (model) => nofx(new Model(
  model.label,
  false,
  model.control,
  model.target,
  model.focus
));

export const press = (model) => nofx(model);

const delegateControlUpdate = (model, action) =>
  swapControl(model, Control.update(model.control, action));

const swapControl = (model, [control, fx]) => [
  new Model(
    model.label,
    model.isActive,
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
    model.isActive,
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
    model.isActive,
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
      [className]: true
    }),
    disabled: toggle('disabled', model.control.isDisabled),
    onFocus: () => address(Activate),
    onBlur: () => address(Deactivate),
    onMouseOver: () => address(Over),
    onMouseOut: () => address(Out),
    onMouseDown: () => address(Down),
    onClick: () => address(Click),
    onMouseUp: () => address(Up)
  }, [
    model.label
  ]);