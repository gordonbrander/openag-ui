// Generic template for environmental data points
import {html, forward, Effects} from 'reflex';
import {merge} from './common/prelude';
import * as Unknown from './common/unknown';

import * as CurrentRecipe from './environmental-data-point/recipe';

// Provide variable name and title for module
export const init = (variable, title) => [
  {
    variable,
    title,
    value: null
  },
  Effects.none
];

// Send an array of datapoints
export const AddMany = value => ({
  type: 'AddMany',
  value
});

// Create a sensor reading value change action
export const Add = value => ({
  type: 'Add',
  value
});

const last = array =>
  array.length > 0 ? array[array.length - 1] : array[0];

export const update = (model, action) =>
  // Update current sensor value record from reading action.
  action.type === 'Add' ?
  [merge(model, {value: action.value}), Effects.none] :
  // @TODO merge these or create a rolling history?
  action.type === 'AddMany' ?
  [merge(model, {value: last(action.value)}), Effects.none] :
  Unknown.update(model, action);

// @TODO read C or F
const templateDataPoint = dataPoint => (
  dataPoint && dataPoint.value ?
  [
    html.span({
      className: 'sense-number'
    }, [String(dataPoint.value)]),
    html.span({
      className: 'sense-deg'
    }, ['°C'])
  ] :
  [
    html.span({
      className: 'sense-number'
    }, ['-'])
  ]
);

export const view = (model, address) =>
  html.figure({
    className: 'sense-main'
  }, [
    html.figcaption({
      className: 'sense-title'
    }, [
      model.title
    ]),
    html.div({
      className: 'sense-value'
    }, templateDataPoint(model.value))
  ]);
