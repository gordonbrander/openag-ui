/*
Module for the sidebar air temperature unit that looks like a little sun.
*/
import {html, Effects} from 'reflex';
import {update as updateUnknown} from '../../common/unknown';

// Degree sign.
const UNIT = '\u00B0';

// Actions

// Set air temperature in sidebar
export const SetValue = value => ({
  type: 'SetValue',
  value
});

// Init and update

export const init = value => [
  value,
  Effects.none
];

export const update = (value, action) =>
  action.type === 'SetValue' ?
  [action.value, Effects.none] :
  updateUnknown(value, action);
  
// View

export const view = (value, address) => {
  if (value == null) {
    return html.div({
      className: 'env-temperature env-temperature--large'
    }, ['-']);
  }
  else {
    return html.div({
      className: 'env-temperature env-temperature--large'
    }, [
      readTemperature(value),
      html.span({
        className: 'env-temperature--unit'
      }, [UNIT])
    ]);
  }
}

const readTemperature = value =>
  (Math.round(value) + '');