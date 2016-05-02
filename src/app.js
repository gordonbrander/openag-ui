import {html, forward, Effects} from 'reflex';
import {merge, tagged, tag, batch} from './common/prelude';
import * as Unknown from './common/unknown';
import {cursor} from './common/cursor';
import * as AppNav from './app/nav';
import * as EnvironmentalDataPoint from './environmental-data-point';
import * as Recipes from './recipes';
import * as RecipeForm from './recipe/form';
import * as Overlay from './overlay';

// Action tagging functions

const RecipesAction = tag('Recipes');
const EnvironmentalDataPointAction = tag('EnvironmentalDataPoint');

const OverlayAction = action =>
  action.type === 'Click' ?
  ExitAddRecipe :
  tagged('Overlay', action);

const AppNavAction = action =>
  action.type === 'RequestNewRecipe' ?
  EnterAddRecipe :
  action.type === 'Selected' ?
  RequestMode(action.value) :
  tagged('AppNav', action);

const RecipeFormAction = action =>
  action.type === 'Submitted' ?
  CreateRecipe(action.recipe) :
  // We intercept cancel actions and send a "cancel whole form modal" action
  // instead.
  action.type === 'Cancel' ?
  CancelAddRecipe :
  tagged('RecipeForm', action);

// Actions

const RequestRecipePut = recipe => RecipesAction(Recipes.RequestPut(recipe));
const OpenRecipeForm = RecipeFormAction(RecipeForm.Open);
const CloseRecipeForm = RecipeFormAction(RecipeForm.Close);
const OpenOverlay = OverlayAction(Overlay.Open);
const CloseOverlay = OverlayAction(Overlay.Close);

const CreateRecipe = recipe => ({
  type: 'CreateRecipe',
  recipe
});

const EnterAddRecipe = {
  type: 'EnterAddRecipe'
};

const ExitAddRecipe = {
  type: 'ExitAddRecipe'
};

// Cancels the modal
const CancelAddRecipe = {
  type: 'CancelAddRecipe'
};

// Cancels the RecipeForm
const CancelRecipeForm = {
  type: 'CancelRecipeForm'
};

const RequestMode = value => ({
  type: 'RequestMode',
  value
});

// Init and update

export const init = () => {
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


const enterAddRecipe = model =>
  batch(update, model, [
    OpenRecipeForm,
    OpenOverlay
  ]);

const exitAddRecipe = model =>
  batch(update, model, [
    CloseRecipeForm,
    CloseOverlay
  ]);

const cancelAddRecipe = model =>
  batch(update, model, [
    CancelRecipeForm,
    CloseOverlay
  ]);

const requestMode = (model, mode) => {
  const [environmentalDataPoint, environmentalDataPointFx] =
    EnvironmentalDataPoint.update(
      model.environmentalDataPoint,
      (
        mode === 'recipe' ?
        EnvironmentalDataPoint.Open :
        EnvironmentalDataPoint.Close
      )
    );
  const [recipes, recipesFx] = Recipes.update(
    model.recipes,
    (
      mode === 'library' ?
      Recipes.Open :
      Recipes.Close
    )
  );
  return [
    merge(model, {
      environmentalDataPoint,
      recipes
    }),
    Effects.batch([
      environmentalDataPointFx.map(EnvironmentalDataPointAction),
      recipesFx.map(RecipesAction)
    ])
  ];
}

const createRecipe = (model, recipe) =>
  batch(update, model, [
    RequestRecipePut(recipe)
  ]);

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
  action.type === 'EnterAddRecipe' ?
  enterAddRecipe(model) :
  action.type === 'ExitAddRecipe' ?
  exitAddRecipe(model) :
  action.type === 'CancelAddRecipe' ?
  cancelAddRecipe(model) :
  action.type === 'CancelRecipeForm' ?
  updateRecipeForm(model, RecipeForm.Cancel) :
  action.type === 'CreateRecipe' ?
  createRecipe(model, action.recipe) :
  action.type === 'RequestMode' ?
  requestMode(model, action.value) :
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
