/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/*
Commonly used functions. Original source can be found here.
https://github.com/browserhtml/browserhtml/blob/master/src/common/prelude.js
*/
import {Effects} from 'reflex';

export const merge = /*::<model:{}>*/
  ( model/*:model*/
  , changes/*:{[key:string]: any}*/
  )/*:model*/ => {
  let result = model
  for (let key in changes) {
    if (changes.hasOwnProperty(key)) {
      const value = changes[key]

      if (model[key] !== value) {
        if (result === model) {
          result = {}
          for (let key in model) {
            if (model.hasOwnProperty(key)) {
              result[key] = model[key]
            }
          }
        }

        if (value === void(0)) {
          delete result[key]
        } else {
          result[key] = value
        }
      }
    }
  }

  // @FlowIssue: Ok just trust me on this!
  return result
}

// Batch actions
// @TODO: Optimze batch by avoiding intermidiate states.
// batch performs a reduction over actions building up a [model, fx]
// pair containing all updates. In the process we create a intermidiate
// model instances that are threaded through updates cycles, there for
// we could implement clojure like `transient(model)` / `persistent(model)`
// that would mark `model` as mutable / immutable allowing `merge` to mutate
// in place if `modlel` is "mutable". `batch` here wolud be able to take
// advantage of these to update same model in place.
export const batch = /*:: <model, action>*/
  ( update/*:(m:model, a:action) => [model, Effects<action>]*/
  , model/*:model*/
  , actions/*:Array<action>*/
  )/*:[model, Effects<action>]*/ =>
{
  let effects = [];
  let index = 0;
  const count = actions.length;
  while (index < count) {
    const action = actions[index];
    let [state, fx] = update(model, action);
    model = state;
    effects.push(fx);
    index = index + 1
  }

  return [model, Effects.batch(effects)];
}

export const tagged = /*::<tag:string, kind>*/
  (tag/*:tag*/, value/*:kind*/)/*:Tagged<tag, kind>*/ =>
  ({ type: tag, source: value });

export const tag = /*::<tag:string, kind>*/
  (tag/*:tag*/)/*:(value:kind) => Tagged<tag, kind>*/ =>
  value =>
  ({ type: tag, source: value });

