/*
Tools for working with environmental data point document objects stored in
Pouch or Couch.
*/
import findLast from 'lodash/findLast';
import {map as mapMaybe} from '../common/maybe';

export const RECIPE_START = 'recipe_start';
export const RECIPE_END = 'recipe_end';
export const AIR_TEMPERATURE = 'air_temperature';
export const MARKER = 'marker';

// X and Y accessors for documents.
// Timestamp is unix epoch in seconds.
export const x = doc => doc.timestamp;
export const xMs = doc => doc.timestamp * 1000;
// Value is float
export const y = doc => doc.value;
export const isDesired = doc => doc.is_desired;
export const variable = doc => doc.variable;

export const isRecipeStart = dataPoint => dataPoint.variable === RECIPE_START;
export const isRecipeEnd = dataPoint => dataPoint.variable === RECIPE_END;

export const isRecipeRunning = (recipeStart, recipeEnd) => {
  // If we have both a recipe start and a recipe end, check that the recipe
  // start comes after.
  if (recipeStart && recipeEnd) {
    return x(recipeStart) > x(recipeEnd);
  }
  // Otherwise, check if we have no recipe end. If no recipe end, then recipe
  // is in progress.
  else {
    return recipeStart && !recipeEnd;
  }
}

// Find most recent recipe start or recipe end.
// These functions start traversing the list from the end, which is much
// more efficient, given our list is sorted.
export const findRecipeStart = data => findLast(data, isRecipeStart);
export const findRecipeEnd = data => findLast(data, isRecipeEnd);

// Given a list of datapoints, find a running recipe (if any) within them.
export const findRunningRecipe = data => {
  const recipeStart = findRecipeStart(data);
  const recipeEnd = findRecipeEnd(data);

  return (
    isRecipeRunning(recipeStart, recipeEnd) ?
    recipeStart :
    null
  );
}

export const isAirTemperature = dataPoint => dataPoint.variable === AIR_TEMPERATURE;

export const findAirTemperature = data =>
  mapMaybe(findLast(data, isAirTemperature), y);
