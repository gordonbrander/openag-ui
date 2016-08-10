/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
Adapted from
https://github.com/browserhtml/browserhtml/blob/4be9d07a98dc4a2f7764be1f8576ad9485c5079b/src/common/control.js
*/

import {always} from "../common/prelude";
import * as Unknown from "../common/unknown";
import {html, Effects, forward} from "reflex";

export class Model {
  constructor(isDisabled) {
    this.isDisabled = isDisabled
  }
}

Model.enabled = new Model(false);
Model.disabled = new Model(true);

export const Disable = {type: "Disable"};
export const Enable = {type: "Enable"};

export const init = (isDisabled = false) => [
  (isDisabled ? Model.disabled : Model.enabled),
  Effects.none
];

export const update = (model, action) => {
  switch (action.type) {
    case "Enable":
      return enable(model)
    case "Disable":
      return disable(model)
    case "Toggle":
      return toggle(model)
    default:
      return Unknown.update(model, action)
  }
}

export const enable = (model) => [
  Model.enabled,
  Effects.none
];

export const disable = (model) => [
  Model.disabled,
  Effects.none
];

export const toggle = (model) => [
  (model.isDisabled ? Model.enabled : Model.disabled),
  Effects.none
];
