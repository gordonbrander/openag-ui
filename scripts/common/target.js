/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Adapted from
https://github.com/browserhtml/browserhtml/blob/4be9d07a98dc4a2f7764be1f8576ad9485c5079b/src/common/target.js
*/

import {Effects, forward} from "reflex";
import {always, port} from "../common/prelude";
import {constant} from "../lang/functional";
import * as Unknown from "../common/unknown";

export class Model {
  constructor(isPointerOver) {
    this.isPointerOver = isPointerOver
  }
}

Model.over = new Model(true);
Model.out = new Model(false);

export const Over = {type: "Over"};
export const Out = {type: "Out"};

export const init = (isPointerOver = false) => [
  (isPointerOver ? Model.over : Model.out),
  Effects.none
];

export const update = (model, action) => {
  switch (action.type) {
    case "Over":
      return over(model);
    case "Out":
      return out(model);
    default:
      return Unknown.update(model, action);
  }
}

export const over = (model) => [
  Model.over,
  Effects.none
];

export const out = (model) => [
  Model.out,
  Effects.none
];

export const onMouseOver = port(constant(Over));
export const onMouseOut = port(constant(Out));
