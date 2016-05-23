/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const compose = (...lambdas) => {
  /**
  Returns the composition of a list of functions, where each function
  consumes the return value of the function that follows. In math
  terms, composing the functions `f()`, `g()`, and `h()` produces
  `f(g(h()))`.
  Usage:

  var square = function(x) { return x * x }
  var increment = function(x) { return x + 1 }

  var f1 = compose(increment, square)
  f1(5) // => 26

  var f2 = compose(square, increment)
  f2(5) // => 36
  **/

  const composed = (...args) => {
    var index = lambdas.length;
    var result = lambdas[--index](...args);
    while (--index >= 0) {
      result = lambdas[index](result);
    }
    return result;
  };
  composed.lambdas = lambdas;
  composed.toString = compose$toString;
  return composed;
};
// For debugging and errors
const compose$toString = function() {
  return `compose(${this.lambdas.join(', ')})`
}

export const partial = (lambda, ...curried) =>
  (...passed) => lambda(...curried, ...passed);

export const identity = value => value;

export const constant = value => () => value;

