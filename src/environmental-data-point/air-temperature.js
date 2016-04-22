// Air temperature sensor

import {html, forward, Effects} from 'reflex';
import {merge} from '../common/prelude';
import * as Unknown from '../common/unknown';
import {readName} from './util';

// Type here means "sensor type".
//export const init = ({type, title, value}) => [
  //{
    //type,
    //title,
    //value
  //},
  //Effects.none
//];

// Create a sensor reading value change action
//export const DataPoint = value => ({
  //type: 'DataPoint',
  //value
//});

//export const update = (model, action) =>
  //// Update current sensor value record from reading action.
  //action.type === 'DataPoint' ?
  //[merge(model, {value: action.value}), Effects.none] :
  //Unknown.update(model, action);

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
      className: 'sense-value-number'
    }, [
      model.value ? String(model.value) : ''
    ])
  ]);
