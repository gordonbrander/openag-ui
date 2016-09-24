/*
A wrapper for toggle and slider that is polymorphic. It chooses the module
to be used based on the "type" of actuator (denoted by a string key).
*/
import {html, forward, Effects, thunk} from 'reflex';
import * as Toggle from './actuator-toggle';
import * as Slider from './actuator-slider';
import {render as renderTemplate} from '../../common/stache';
import {merge} from '../../common/prelude';
import {update as updateUnknown} from '../../common/unknown';

const BINARY = 'binary_actuator';
const PWM = 'pwm_actuator';

export const TagControl = action => ({
  type: 'Control',
  source: action
});

export const init = (config) => {
  const [control, fx] = initForType(config);
  const id = 'control_' + control.id;
  const type = config.type;
  return [
    {
      type,
      id,
      control
    },
    fx.map(TagControl)
  ]
}

export const update = (model, action) =>
  action.type === 'Control' ?
  updateControl(model, action.source) :
  updateUnknown(model, action);

const updateControl = (model, action) => {
  const Control = getControlForType(model.type);
  const [control, fx] = Control.update(model.control, action);

  return [
    merge(model, {
      control,
    }),
    fx.map(TagControl)
  ];
}

// View

export const view = (model, address) => {
  const Control = getControlForType(model.type);
  return Control.view(model.control, forward(address, TagControl));
}

// Utils

const initForType = ({id, api, type, title, topic}) => {
  if (type === BINARY) {
    const url = templateTopicUrl(api, topic);
    return Toggle.init(id, url, title);
  }
  else if (type === PWM) {
    const url = templateTopicUrl(api, topic);
    return Slider.initPwm(id, url, title, 0.5);
  }
  else {
    throw Error(`Module type ${type} not supported by Control module`);
  }
}

const getControlForType = type =>
  type === BINARY ?
  Toggle :
  type === PWM ?
  Slider :
  null;

const templateTopicUrl = (api, topic) =>
  renderTemplate(topic, {api});