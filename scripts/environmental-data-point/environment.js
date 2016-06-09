import {html, forward, Effects, thunk} from 'reflex';
import {merge, tagged, tag, batch} from '../common/prelude';
import * as Indexed from '../common/indexed';
import * as Unknown from '../common/unknown';
import {cursor} from '../common/cursor';
import {compose} from '../lang/functional';
import * as EnvironmentalDataPoint from '../environmental-data-point';
import * as CurrentRecipe from '../environmental-data-point/recipe';
// @TODO do proper localization
import * as LANG from '../environmental-data-point/lang';

const RECIPE_START = 'recipe_start';
const RECIPE_END = 'recipe_end';
const AIR_TEMPERATURE = 'air_temperature';
const AIR_HUMIDITY = 'air_humidity';
const WATER_TEMPERATURE = 'water_temperature';

// Actions

const NoOp = {
  type: 'NoOp'
};

export const AddDataPoint = value => ({
  type: 'AddDataPoint',
  value
});

const AirTemperatureAction = tag('AirTemperature');
const AirHumidityAction = tag('AirHumidity');
const WaterTemperatureAction = tag('WaterTemperature');

const AddAirTemperature = compose(
  AirTemperatureAction,
  EnvironmentalDataPoint.Add
);

const AddAirHumidity = compose(
  AirHumidityAction,
  EnvironmentalDataPoint.Add
);

const AddWaterTemperature = compose(
  WaterTemperatureAction,
  EnvironmentalDataPoint.Add
);

const CurrentRecipeAction = tag('CurrentRecipe');
const CurrentRecipeStart = compose(CurrentRecipeAction, CurrentRecipe.Start);
const CurrentRecipeEnd = compose(CurrentRecipeAction, CurrentRecipe.End);

// Model init and update

export const init = () => {
  const [currentRecipe, currentRecipeFx] = CurrentRecipe.init();

  const [airTemperature, airTemperatureFx] = EnvironmentalDataPoint.init(
    AIR_TEMPERATURE,
    LANG[AIR_TEMPERATURE]
  );

  const [airHumidity, airHumidityFx] = EnvironmentalDataPoint.init(
    AIR_HUMIDITY,
    LANG[AIR_HUMIDITY]
  );

  const [waterTemperature, waterTemperatureFx] = EnvironmentalDataPoint.init(
    WATER_TEMPERATURE,
    LANG[WATER_TEMPERATURE]
  );

  return [
    {
      currentRecipe,
      airTemperature,
      airHumidity,
      waterTemperature
    },
    Effects.batch([
      currentRecipeFx.map(CurrentRecipeAction),
      airTemperatureFx.map(AirTemperatureAction),
      airHumidityFx.map(AirHumidityAction),
      waterTemperatureFx.map(WaterTemperatureAction)
    ])
  ];
};

const updateAirTemperature = cursor({
  get: model => model.airTemperature,
  set: (model, airTemperature) => merge(model, {airTemperature}),
  update: EnvironmentalDataPoint.update,
  tag: AirTemperatureAction
});

const updateAirHumidity = cursor({
  get: model => model.airHumidity,
  set: (model, airHumidity) => merge(model, {airHumidity}),
  update: EnvironmentalDataPoint.update,
  tag: AirHumidityAction
});

const updateWaterTemperature = cursor({
  get: model => model.waterTemperature,
  set: (model, waterTemperature) => merge(model, {waterTemperature}),
  update: EnvironmentalDataPoint.update,
  tag: WaterTemperatureAction
});

const updateCurrentRecipe = cursor({
  get: model => model.currentRecipe,
  set: (model, currentRecipe) => merge(model, {currentRecipe}),
  update: CurrentRecipe.update,
  tag: CurrentRecipeAction
});

const addDataPoint = (model, dataPoint) =>
  dataPoint.variable === AIR_TEMPERATURE ?
  update(model, AddAirTemperature(dataPoint.value)) :
  dataPoint.variable === AIR_HUMIDITY ?
  update(model, AddAirHumidity(dataPoint.value)) :
  dataPoint.variable === WATER_TEMPERATURE ?
  update(model, AddWaterTemperature(dataPoint.value)) :
  // Ignore datapoints that we don't understand/don't want to render.
  update(model, NoOp);

// Is the problem that I'm not mapping the returned effect?
export const update = (model, action) =>
  action.type === 'NoOp' ?
  [model, Effects.none] :
  action.type === 'AddDataPoint' ?
  addDataPoint(model, action.value) :
  action.type === 'CurrentRecipe' ?
  updateCurrentRecipe(model, action.source) :
  action.type === 'AirTemperature' ?
  updateAirTemperature(model, action.source) :
  action.type === 'AirHumidity' ?
  updateAirHumidity(model, action.source) :
  action.type === 'WaterTemperature' ?
  updateWaterTemperature(model, action.source) :
  action.type === 'Restore' ?
  restore(model, action.value) :
  Unknown.update(model, action);
