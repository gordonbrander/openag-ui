// Air temperature sensor

import {html, forward, Effects} from 'reflex';
import {merge} from '../common/prelude';
import * as Unknown from '../common/unknown';
import {readName} from './util';

const AIR_TEMPERATURE = 'water_temperature';

// Export variable name for parent module to reference.
export const variable = AIR_TEMPERATURE;

// Type here means "sensor type".
export const init = () => [
  {
    variable: AIR_TEMPERATURE,
    title: readName(AIR_TEMPERATURE),
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

export const update = (model, action) =>
  // Update current sensor value record from reading action.
  action.type === 'Add' ?
  [merge(model, {value: action.value}), Effects.none] :
  // @TODO merge these or create a rolling history?
  action.type === 'AddMany' ?
  [merge(model, {value: action.value[action.value.length - 1]}), Effects.none] :
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
    '-'
  ]
);

export const view = (model, address) =>
  html.figure({
    className: 'sense-main'
  }, [
    html.figcaption({
      className: 'sense-title'
    }, [
      readName(model.variable)
    ]),
    html.div({
      className: 'sense-value'
    }, templateDataPoint(model.value))
  ]);
