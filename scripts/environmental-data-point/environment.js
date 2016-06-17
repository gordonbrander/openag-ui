import {html, forward, Effects, thunk} from 'reflex';
import {merge, tagged, tag, batch} from '../common/prelude';
import * as Indexed from '../common/indexed';
import * as Unknown from '../common/unknown';
import {cursor} from '../common/cursor';
import {compose} from '../lang/functional';
import * as EnvironmentalDataPoint from '../environmental-data-point';
import * as LineChart from '../environmental-data-point/line-chart';
import * as CurrentRecipe from '../environmental-data-point/recipe';
// @TODO do proper localization
import * as LANG from '../environmental-data-point/lang';

const RECIPE_START = 'recipe_start';
const RECIPE_END = 'recipe_end';
const AIR_TEMPERATURE = 'air_temperature';
const HUMIDITY = 'humidity';
const WATER_TEMPERATURE = 'water_temperature';

// Actions

const NoOp = {
  type: 'NoOp'
};

export const AddDataPoint = value => ({
  type: 'AddDataPoint',
  value
});

const RecipeStartAction = tag('RecipeStart');
const RecipeEndAction = tag('RecipeEnd');
const AirTemperatureAction = tag('AirTemperature');
const HumidityAction = tag('Humidity');
const WaterTemperatureAction = tag('WaterTemperature');

const AddRecipeStart = compose(
  RecipeStartAction,
  EnvironmentalDataPoint.Add
);

const AddRecipeEnd = compose(
  RecipeEndAction,
  EnvironmentalDataPoint.Add
);

const AddAirTemperature = compose(
  AirTemperatureAction,
  LineChart.Add
);

const AddHumidity = compose(
  HumidityAction,
  EnvironmentalDataPoint.Add
);

const AddWaterTemperature = compose(
  WaterTemperatureAction,
  EnvironmentalDataPoint.Add
);

// Model init and update

export const init = () => {
  const [recipeStart, recipeStartFx] = EnvironmentalDataPoint.init(
    RECIPE_START,
    ''
  );

  const [recipeEnd, recipeEndFx] = EnvironmentalDataPoint.init(
    RECIPE_END,
    ''
  );

  const [airTemperature, airTemperatureFx] = LineChart.init(
    AIR_TEMPERATURE,
    LANG[AIR_TEMPERATURE]
  );

  const [humidity, humidityFx] = EnvironmentalDataPoint.init(
    HUMIDITY,
    LANG[HUMIDITY]
  );

  const [waterTemperature, waterTemperatureFx] = EnvironmentalDataPoint.init(
    WATER_TEMPERATURE,
    LANG[WATER_TEMPERATURE]
  );

  return [
    {
      recipeStart,
      recipeEnd,
      airTemperature,
      humidity,
      waterTemperature
    },
    Effects.batch([
      recipeStartFx.map(RecipeStartAction),
      recipeEndFx.map(RecipeEndAction),
      airTemperatureFx.map(AirTemperatureAction),
      humidityFx.map(HumidityAction),
      waterTemperatureFx.map(WaterTemperatureAction)
    ])
  ];
};

const updateRecipeStart = cursor({
  get: model => model.recipeStart,
  set: (model, recipeStart) => merge(model, {recipeStart}),
  update: EnvironmentalDataPoint.update,
  tag: RecipeStartAction
});

const updateRecipeEnd = cursor({
  get: model => model.recipeEnd,
  set: (model, recipeEnd) => merge(model, {recipeEnd}),
  update: EnvironmentalDataPoint.update,
  tag: RecipeEndAction
});

const updateAirTemperature = cursor({
  get: model => model.airTemperature,
  set: (model, airTemperature) => merge(model, {airTemperature}),
  update: LineChart.update,
  tag: AirTemperatureAction
});

const updateHumidity = cursor({
  get: model => model.humidity,
  set: (model, humidity) => merge(model, {humidity}),
  update: EnvironmentalDataPoint.update,
  tag: HumidityAction
});

const updateWaterTemperature = cursor({
  get: model => model.waterTemperature,
  set: (model, waterTemperature) => merge(model, {waterTemperature}),
  update: EnvironmentalDataPoint.update,
  tag: WaterTemperatureAction
});

const addDataPoint = (model, dataPoint) =>
  dataPoint.variable === RECIPE_START ?
  update(model, AddRecipeStart(dataPoint.value)) :
  dataPoint.variable === RECIPE_END ?
  update(model, AddRecipeEnd(dataPoint.value)) :
  dataPoint.variable === AIR_TEMPERATURE ?
  update(model, AddAirTemperature(dataPoint.timestamp, Number.parseFloat(dataPoint.value))) :
  dataPoint.variable === HUMIDITY ?
  update(model, AddHumidity(dataPoint.value)) :
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
  action.type === 'RecipeStart' ?
  updateRecipeStart(model, action.source) :
  action.type === 'RecipeEnd' ?
  updateRecipeEnd(model, action.source) :
  action.type === 'AirTemperature' ?
  updateAirTemperature(model, action.source) :
  action.type === 'Humidity' ?
  updateHumidity(model, action.source) :
  action.type === 'WaterTemperature' ?
  updateWaterTemperature(model, action.source) :
  action.type === 'Restore' ?
  restore(model, action.value) :
  Unknown.update(model, action);

// View

export const view = (model, address) =>
  html.div({
    className: 'environment-main'
  }, [
    thunk(
      'water-temperature',
      EnvironmentalDataPoint.view,
      model.waterTemperature,
      forward(address, WaterTemperatureAction)
    ),
    thunk(
      'humidity',
      // @TODO fix view (renders degrees c)
      EnvironmentalDataPoint.view,
      model.humidity,
      forward(address, HumidityAction)
    ),
    thunk(
      'air-temperature',
      LineChart.view,
      model.airTemperature,
      forward(address, AirTemperatureAction)
    )
  ])
