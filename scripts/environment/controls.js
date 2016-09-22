import {html, forward, Effects, thunk} from 'reflex';
import {actuators as ACTUATORS} from '../../openag-config.json';
import {update as updateUnknown} from '../common/unknown';
import {merge} from '../common/prelude';
import {cursor} from '../common/cursor';
import {localize} from '../common/lang';
import * as Slider from './controls/actuator-slider';

const LIGHT_ILLUMINANCE = ACTUATORS.light_illuminance;

// Actions

export const Configure = origin => ({
  type: 'Configure',
  origin
});

export const TagLightIlluminance = action => ({
  type: 'LightIlluminance',
  source: action
});

// Update, init

export const init = () => {
  const [lightIlluminance, lightIlluminanceFx] = Slider.init(
    localize('Light'),
    LIGHT_ILLUMINANCE.min,
    LIGHT_ILLUMINANCE.max,
    null,
    null,
    LIGHT_ILLUMINANCE.unit
  );

  const model = {
    origin: null,
    lightIlluminance
  };

  return [
    model,
    Effects.batch([
      lightIlluminanceFx.map(TagLightIlluminance)
    ])
  ];
}

export const update = (model, action) =>
  action.type === 'Configure' ?
  configure(model, action.origin) :
  action.type === 'LightIlluminance' ?
  updateLightIlluminance(model, action.source) :
  updateUnknown(model, action);

const configure = (model, origin) => [
  merge(model, {origin}),
  Effects.none
];

const updateLightIlluminance = cursor({
  get: model => model.lightIlluminance,
  set: (model, lightIlluminance) => merge(model, {lightIlluminance}),
  update: Slider.update,
  tag: TagLightIlluminance
});

// View

export const view = (model, address) =>
  html.div({
    className: 'full-view'
  }, [
    thunk(
      'light-illuminance-control',
      Slider.view,
      model.lightIlluminance,
      forward(address, TagLightIlluminance),
      'range light-illuminance-range'
    )
  ]);