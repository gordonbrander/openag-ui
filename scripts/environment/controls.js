import {html, forward, Effects, thunk} from 'reflex';
import {actuators as ACTUATORS} from '../../openag-config.json';
import {update as updateUnknown} from '../common/unknown';
import {merge} from '../common/prelude';
import {cursor} from '../common/cursor';
import {localize} from '../common/lang';
import * as Slider from './controls/actuator-slider';

const LIGHT_ILLUMINANCE = ACTUATORS.light_illuminance;
const EC = ACTUATORS.water_electrical_conductivity;

// Actions

export const Configure = origin => ({
  type: 'Configure',
  origin
});

export const TagLightIlluminance = action => ({
  type: 'LightIlluminance',
  source: action
});

export const TagWaterElectricalConductivity = action => ({
  type: 'WaterElectricalConductivity',
  source: action
});

// Update, init

export const init = () => {
  const [lightIlluminance, lightIlluminanceFx] = Slider.init(
    LIGHT_ILLUMINANCE.title,
    LIGHT_ILLUMINANCE.unit,
    null,
    null,
    LIGHT_ILLUMINANCE.min,
    LIGHT_ILLUMINANCE.max,
    LIGHT_ILLUMINANCE.step
  );

  const [waterElectricalConductivity, waterElectricalConductivityFx] = Slider.init(
    EC.title,
    EC.unit,
    null,
    null,
    EC.min,
    EC.max,
    EC.step
  );

  const model = {
    origin: null,
    lightIlluminance,
    waterElectricalConductivity
  };

  return [
    model,
    Effects.batch([
      lightIlluminanceFx.map(TagLightIlluminance),
      waterElectricalConductivityFx.map(TagWaterElectricalConductivity)
    ])
  ];
}

export const update = (model, action) =>
  action.type === 'Configure' ?
  configure(model, action.origin) :
  action.type === 'LightIlluminance' ?
  updateLightIlluminance(model, action.source) :
  action.type === 'WaterElectricalConductivity' ?
  updateWaterElectricalConductivity(model, action.source) :
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

const updateWaterElectricalConductivity = cursor({
  get: model => model.waterElectricalConductivity,
  set: (model, waterElectricalConductivity) => merge(model, {waterElectricalConductivity}),
  update: Slider.update,
  tag: TagWaterElectricalConductivity
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
      forward(address, TagLightIlluminance)
    ),
    thunk(
      'water-electrical-conductivity-control',
      Slider.view,
      model.waterElectricalConductivity,
      forward(address, TagWaterElectricalConductivity)
    )
  ]);