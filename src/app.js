import {html, forward, Effects} from 'reflex';
import {merge, tagged, tag} from './common/prelude';
import * as Unknown from './common/unknown';
import {cursor} from './common/cursor';
import * as AppNav from './app/nav';
import * as EnvironmentalDataPoint from './environmental-data-point';
import * as Recipes from './recipes';
import * as RecipeForm from './recipe/form';
import * as Overlay from './overlay';

// Actions

const CreateRecipe = recipe => ({
  type: 'CreateRecipe',
  recipe
});

const RequestOpenRecipeForm = {
  type: 'RequestOpenRecipeForm'
};

const RequestCloseRecipeForm = {
  type: 'RequestCloseRecipeForm'
};

const ModeSelected = value => ({
  type: 'ModeSelected',
  value
});

// Action tagging functions

const RecipesAction = tag('Recipes');
const EnvironmentalDataPointAction = tag('EnvironmentalDataPoint');

const OverlayAction = action =>
  action.type === 'Click' ?
  RequestCloseRecipeForm :
  tagged('Overlay', action);

const AppNavAction = action =>
  action.type === 'RequestNewRecipe' ?
  RequestOpenRecipeForm :
  action.type === 'Selected' ?
  ModeSelected(action.value) :
  tagged('AppNav', action);

const RecipeFormAction = action =>
  action.type === 'RequestCreate' ?
  CreateRecipe(action.recipe) :
  action.type === 'Cancel' ?
  RequestCloseRecipeForm :
  tagged('RecipeForm', action);

// Init and update

export const init = () => {
    EnvironmentalDataPoint.init();
  const [environmentalDataPoint, environmentalDataPointFx] =
    EnvironmentalDataPoint.init();
  const [recipeForm, recipeFormFx] = RecipeForm.init();
  const [recipes, recipesFx] = Recipes.init();
  const [appNav, appNavFx] = AppNav.init();
  const [overlay, overlayFx] = Overlay.init();

  return [
    {
      environmentalDataPoint,
      recipeForm,
      recipes,
      appNav,
      overlay
    },
    Effects.batch([
      environmentalDataPointFx.map(EnvironmentalDataPointAction),
      recipeFormFx.map(RecipeFormAction),
      recipesFx.map(RecipesAction),
      appNavFx.map(AppNavAction),
      overlayFx.map(OverlayAction)
    ])
  ];
}

const updateAppNav = cursor({
  get: model => model.appNav,
  set: (model, appNav) => merge(model, {appNav}),
  update: AppNav.update,
  tag: AppNavAction
});

const updateRecipes = cursor({
  get: model => model.recipes,
  set: (model, recipes) => merge(model, {recipes}),
  update: Recipes.update,
  tag: RecipesAction
});

const updateRecipeForm = cursor({
  get: model => model.recipeForm,
  set: (model, recipeForm) => merge(model, {recipeForm}),
  update: RecipeForm.update,
  tag: RecipeFormAction
});

const updateEnvironmentalDataPoint = cursor({
  get: model => model.environmentalDataPoint,
  set: (model, environmentalDataPoint) => merge(model, {environmentalDataPoint}),
  update: EnvironmentalDataPoint.update,
  tag: EnvironmentalDataPointAction
});

const updateOverlay = cursor({
  get: model => model.overlay,
  set: (model, overlay) => merge(model, {overlay}),
  update: Overlay.update,
  tag: OverlayAction
});

const openRecipeForm = model => {
  const [recipeForm, recipeFormFx] = RecipeForm.update(model.recipeForm, RecipeForm.Open);
  const [overlay, overlayFx] = Overlay.update(model.overlay, Overlay.Open);
  return [
    merge(model, {
      overlay,
      recipeForm
    }),
    Effects.batch([
      recipeFormFx,
      overlayFx
    ])
  ];
}

const closeRecipeForm = model => {
  const [recipeForm, recipeFormFx] = RecipeForm.update(model.recipeForm, RecipeForm.Close);
  const [overlay, overlayFx] = Overlay.update(model.overlay, Overlay.Close);
  return [
    merge(model, {
      overlay,
      recipeForm
    }),
    Effects.batch([
      recipeFormFx,
      overlayFx
    ])
  ];
}

const createRecipe = (model, recipe) =>
  updateRecipes(model, Recipes.RequestPut(recipe));

export const update = (model, action) =>
  // Cursor-based update functions
  action.type === 'EnvironmentalDataPoint' ?
  updateEnvironmentalDataPoint(model, action.source) :
  action.type === 'Recipes' ?
  updateRecipes(model, action.source) :
  action.type === 'RecipeForm' ?
  updateRecipeForm(model, action.source) :
  action.type === 'AppNav' ?
  updateAppNav(model, action.source) :
  action.type === 'Overlay' ?
  updateOverlay(model, action.source) :
  // Specialized update functions
  action.type === 'RequestOpenRecipeForm' ?
  openRecipeForm(model) :
  action.type === 'RequestCloseRecipeForm' ?
  closeRecipeForm(model) :
  action.type === 'CreateRecipe' ?
  createRecipe(model, action.recipe) :

  Unknown.update(model, action);

export const view = (model, address) => html.div({
  className: 'app-main'
}, [
  AppNav.view(model.appNav, forward(address, AppNavAction)),
  EnvironmentalDataPoint.view(
    model.environmentalDataPoint,
    forward(address, EnvironmentalDataPointAction)
  ),
  Recipes.view(model.recipes, forward(address, RecipesAction)),
  Overlay.view(model.overlay, forward(address, OverlayAction)),
  RecipeForm.view(model.recipeForm, forward(address, RecipeFormAction))
]);
