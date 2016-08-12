import {html, forward, Effects, Task, thunk} from 'reflex';
import {merge, tagged, tag, batch} from '../common/prelude';
import * as Unknown from '../common/unknown';

export const SetAirTemperature = value => ({
  type: 'SetAirTemperature',
  value
});

const UNIT = '\u00B0';

export const init = () => [
  {
    airTemperature: null,
    activeRecipe: null
  },
  Effects.none
];

export const update = (model, action) =>
  action.type === 'SetAirTemperature' ?
  setAirTemperature(model, action.value) :
  Unknown.update(model, action);

const setAirTemperature = (model, airTemperature) => {
  return (
    airTemperature != null ?
    [merge(model, {airTemperature}), Effects.none] :
    [model, Effects.none]
  );
}

// View

export const view = (model, address) =>
  html.aside({
    className: 'sidebar-summary'
  }, [
    html.div({
      className: 'sidebar-summary--in'
    }, [
      viewAirTemperature(model.airTemperature)
    ])
  ]);

const viewAirTemperature = airTemperature => {
  if (airTemperature == null) {
    return html.div({
      className: 'env-temperature env-temperature--large'
    }, ['-']);
  }
  else {
    return html.div({
      className: 'env-temperature env-temperature--large'
    }, [
      readTemperature(airTemperature),
      html.span({
        className: 'env-temperature--unit'
      }, [UNIT])
    ]);
  }
}

const readTemperature = airTemperature =>
  (Math.round(airTemperature.value) + '');