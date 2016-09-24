import {html, forward, Effects, thunk} from 'reflex';
import {actuators as ACTUATORS} from '../../openag-config.json';
import {update as updateUnknown} from '../common/unknown';
import {merge, batch} from '../common/prelude';
import {cursor} from '../common/cursor';
import {localize} from '../common/lang';
import {compose} from '../lang/functional';
import * as Toggle from './controls/actuator-toggle';
import * as Slider from './controls/actuator-slider';

const RED_LIGHT = ACTUATORS.items.red_light;

// Actions

// Configure module (usually just after startup)
export const Configure = (api, environment) => ({
  type: 'Configure',
  api,
  environment
});

const Tag = type => action => ({
  type,
  source: action
});

const TagRedLight = Tag('RedLight');
const ConfigureRedLight = compose(TagRedLight, Toggle.Configure);

// Update, init

export const init = () => {
  const [redLight, redLightFx] = Slider.init(
    RED_LIGHT.topic,
    RED_LIGHT.title,
    0.5,
    0,
    1,
    0.1
  );

  const model = {
    api: null,
    environment: null,
    redLight
  };

  return [
    model,
    Effects.batch([
      redLightFx.map(TagRedLight)
    ])
  ];
}

export const update = (model, action) =>
  action.type === 'Configure' ?
  configure(model, action.api, action.environment) :
  action.type === 'RedLight' ?
  updateRedLight(model, action.source) :
  updateUnknown(model, action);

const configure = (model, api, environment) => {
  const next = merge(model, {
    api,
    environment
  });

  return batch(update, model, [
    ConfigureRedLight(api)
  ]);
}

const updateRedLight = cursor({
  get: model => model.redLight,
  set: (model, redLight) => merge({redLight}),
  update: Slider.update,
  tag: TagRedLight
});

// View

export const view = (model, address) =>
  html.div({
    className: 'full-view'
  }, [
    thunk(
      'controls-red-light',
      Slider.view,
      model.redLight,
      forward(address, TagRedLight)
    )
  ]);