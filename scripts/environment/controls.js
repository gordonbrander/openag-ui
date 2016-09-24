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
const BLUE_LIGHT = ACTUATORS.items.blue_light;
const WHITE_LIGHT = ACTUATORS.items.white_light;

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
const ConfigureRedLight = compose(TagRedLight, Slider.Configure);

const TagBlueLight = Tag('BlueLight');
const ConfigureBlueLight = compose(TagBlueLight, Slider.Configure);

const TagWhiteLight = Tag('WhiteLight');
const ConfigureWhiteLight = compose(TagWhiteLight, Slider.Configure);

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

  const [blueLight, blueLightFx] = Slider.init(
    BLUE_LIGHT.topic,
    BLUE_LIGHT.title,
    0.5,
    0,
    1,
    0.1
  );

  const [whiteLight, whiteLightFx] = Slider.init(
    WHITE_LIGHT.topic,
    WHITE_LIGHT.title,
    0.5,
    0,
    1,
    0.1
  );

  const model = {
    api: null,
    environment: null,
    redLight,
    blueLight,
    whiteLight
  };

  return [
    model,
    Effects.batch([
      redLightFx.map(TagRedLight),
      blueLightFx.map(TagBlueLight),
      whiteLightFx.map(TagWhiteLight)
    ])
  ];
}

export const update = (model, action) =>
  action.type === 'Configure' ?
  configure(model, action.api, action.environment) :
  action.type === 'RedLight' ?
  updateRedLight(model, action.source) :
  action.type === 'BlueLight' ?
  updateBlueLight(model, action.source) :
  action.type === 'WhiteLight' ?
  updateWhiteLight(model, action.source) :
  updateUnknown(model, action);

const configure = (model, api, environment) => {
  const next = merge(model, {
    api,
    environment
  });

  return batch(update, next, [
    ConfigureRedLight(api),
    ConfigureBlueLight(api),
    ConfigureWhiteLight(api)
  ]);
}

const updateRedLight = cursor({
  get: model => model.redLight,
  set: (model, redLight) => merge(model, {redLight}),
  update: Slider.update,
  tag: TagRedLight
});

const updateBlueLight = cursor({
  get: model => model.blueLight,
  set: (model, blueLight) => merge(model, {blueLight}),
  update: Slider.update,
  tag: TagBlueLight
});

const updateWhiteLight = cursor({
  get: model => model.whiteLight,
  set: (model, whiteLight) => merge(model, {whiteLight}),
  update: Slider.update,
  tag: TagWhiteLight
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
    ),
    thunk(
      'controls-blue-light',
      Slider.view,
      model.blueLight,
      forward(address, TagBlueLight)
    ),
    thunk(
      'controls-white-light',
      Slider.view,
      model.whiteLight,
      forward(address, TagWhiteLight)
    )
  ]);