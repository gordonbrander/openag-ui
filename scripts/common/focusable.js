/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
Adapted from
https://github.com/browserhtml/browserhtml/blob/master/src/common/focusable.js
*/

import {port} from "../common/prelude";
import {constant} from "../lang/functional";
import * as Unknown from "../common/unknown";
import {Effects, forward} from "reflex";

export class Model {
  constructor(isFocused) {
    this.isFocused = isFocused
  }
}

Model.focused = new Model(true);
Model.blurred = new Model(false);

export const Focus = {type:"Focus"};
export const Blur = {type: "Blur"};

export const init = (isFocused) => [
  (isFocused ? Model.focused : Model.blurred),
  Effects.none
];

export const update = (model, action) => {
  switch (action.type) {
    case "Focus":
      return focus(model)
    case "Blur":
      return blur(model)
    default:
      return Unknown.update(model, action)
  }
};

export const focus = (model) => [
  Model.focused,
  Effects.none
];

export const blur = (model) => [
  Model.blurred,
  Effects.none
];

export const onFocus = port(constant(Focus));
export const onBlur = port(constant(Blur));
