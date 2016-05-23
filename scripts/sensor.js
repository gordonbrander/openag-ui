import {html, forward, Effects} from 'reflex';
import * as Unknown from '../common/unknown';

export const init = (kind, value) => [
  {
    kind,
    value
  },
  Effects.none
];

// Create a sensor reading value change action
export const Change = value => ({
  type: 'Change',
  value
});

export const update = (model, action) =>
  // Update current sensor value record from reading action.
  action.type === 'Change' ?
  merge(model, {value: action.value}) :
  Unknown.update(model, action);

export const view = (model, address) =>
  html.figure({
    className: 'sense-main'
  }, [
    html.figcaption({
      className: 'sense-kind'
    }, [
      model.kind
    ]),
    html.div({
      className: 'sense-value'
    }, [
      model.value
    ])
  ]);
