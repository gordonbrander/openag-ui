import findLast from 'lodash/findLast';

const RECIPE_START = 'recipe_start';
const RECIPE_END = 'recipe_end';
const MARKER = 'marker';

// We have 2 different kinds of datapoint classes so that instances are
// monomorphic. This gives the JavaScript JIT an opportunity to do some
// optimization, treating instances as structs in the backend.
class StringPoint {
  constructor(variable, is_desired, is_manual, timestamp, value) {
    this.variable = variable;
    this.is_desired = is_desired;
    this.is_manual = is_manual;
    this.timestamp = timestamp;
    this.value = value;
  }
}

class NumberPoint {
  constructor(variable, is_desired, is_manual, timestamp, value) {
    this.variable = variable;
    this.is_desired = is_desired;
    this.is_manual = is_manual;
    this.timestamp = timestamp;
    this.value = value;
  }
}

export const marker = (timestamp, value) =>
  new StringPoint('marker', false, true, timestamp, value);

export const isMarker = dataPoint => dataPoint.variable === MARKER;
export const isRecipeStart = dataPoint => dataPoint.variable === RECIPE_START;
export const isRecipeEnd = dataPoint => dataPoint.variable === RECIPE_END;

export const isRecipeRunning = (recipeStart, recipeEnd) => {
  // If we have both a recipe start and a recipe end, check that the recipe
  // start comes after.
  if (recipeStart && recipeEnd) {
    return readX(recipeStart) > readX(recipeEnd);
  }
  // Otherwise, check if we have no recipe end. If no recipe end, then recipe
  // is in progress.
  else {
    return recipeStart && !recipeEnd;
  }
}

export const findRunningRecipe = data => {
  const recipeStart = findLast(data, isRecipeStart);
  const recipeEnd = findLast(data, isRecipeEnd);

  return (
    isRecipeRunning(recipeStart, recipeEnd) ?
    recipeStart :
    null
  );
}

export const readX = dataPoint =>
  // Timestamp is in seconds. For x position, read timestamp as ms.
  Math.round(dataPoint.timestamp * 1000);

export const readY = dataPoint =>
  Number.parseFloat(dataPoint.value);

export const readVariable = datum => datum.variable;

// @TODO readDataPoint
// reformat openag-config.json to have a hashmap and a weight field, instead
// of being an array. Then only read datapoints that exist in the chart.
// Only NumberDataPoints are supported for chart config in openag-config.json.