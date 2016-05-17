import {html, forward, Effects} from 'reflex';
import {merge, tagged, tag, batch} from './common/prelude';
import * as Unknown from './common/unknown';
import {cursor} from './common/cursor';
import * as AppNav from './app/nav';
import * as EnvironmentalDataPoints from './environmental-data-points';
import * as Recipes from './recipes';
import * as Overlay from './overlay';
import {compose} from './lang/functional';

// Action tagging functions

const RecipesAction = action =>
  action.type === 'Activated' ?
  RecipeActivated(action.value) :
  tagged('Recipes', action);

const EnvironmentalDataPointsAction = tag('EnvironmentalDataPoints');

const OpenRecipes = RecipesAction(Recipes.Open);
const CloseRecipes = RecipesAction(Recipes.Close);

const EnterRecipesMode = {
  type: 'EnterRecipesMode'
};

const ExitRecipesMode = {
  type: 'ExitRecipesMode'
};

const OverlayAction = action =>
  action.type === 'Click' ?
  ExitRecipesMode :
  tagged('Overlay', action);

const AppNavAction = action =>
  action.type === 'RequestRecipes' ?
  EnterRecipesMode :
  tagged('AppNav', action);

// Actions

const RecipeActivated = value => ({
  type: 'RecipeActivated',
  value
});

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

const RequestMode = value => ({
  type: 'RequestMode',
  value
});

const ChangeAppNavRecipe = compose(AppNavAction, AppNav.ChangeRecipe);

// Init and update

export const init = () => {
  const [environmentalDataPoint, environmentalDataPointFx] =
    EnvironmentalDataPoints.init();
  const [recipes, recipesFx] = Recipes.init();
  const [appNav, appNavFx] = AppNav.init();
  const [overlay, overlayFx] = Overlay.init();

  return [
    {
      environmentalDataPoint,
      recipes,
      appNav,
      overlay
    },
    Effects.batch([
      environmentalDataPointFx.map(EnvironmentalDataPointsAction),
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

const updateEnvironmentalDataPoints = cursor({
  get: model => model.environmentalDataPoint,
  set: (model, environmentalDataPoint) => merge(model, {environmentalDataPoint}),
  update: EnvironmentalDataPoints.update,
  tag: EnvironmentalDataPointsAction
});

const updateOverlay = cursor({
  get: model => model.overlay,
  set: (model, overlay) => merge(model, {overlay}),
  update: Overlay.update,
  tag: OverlayAction
});

const enterRecipesMode = model =>
  batch(update, model, [
    OpenRecipes,
    OpenOverlay
  ]);

const exitRecipesMode = model =>
  batch(update, model, [
    CloseRecipes,
    CloseOverlay
  ]);

const recipeActivated = (model, recipe) =>
  update(model, ChangeAppNavRecipe(recipe))

export const update = (model, action) =>
  // Cursor-based update functions
  action.type === 'EnvironmentalDataPoints' ?
  updateEnvironmentalDataPoints(model, action.source) :
  action.type === 'Recipes' ?
  updateRecipes(model, action.source) :
  action.type === 'AppNav' ?
  updateAppNav(model, action.source) :
  action.type === 'Overlay' ?
  updateOverlay(model, action.source) :
  // Specialized update functions
  action.type === 'RecipeActivated' ?
  recipeActivated(model, action.value) :
  action.type === 'EnterRecipesMode' ?
  enterRecipesMode(model) :
  action.type === 'ExitRecipesMode' ?
  exitRecipesMode(model) :
  Unknown.update(model, action);

export const view = (model, address) => html.div({
  className: 'app-main'
}, [
  AppNav.view(model.appNav, forward(address, AppNavAction)),
  EnvironmentalDataPoints.view(
    model.environmentalDataPoint,
    forward(address, EnvironmentalDataPointsAction)
  ),
  Overlay.view(model.overlay, forward(address, OverlayAction)),
  Recipes.view(model.recipes, forward(address, RecipesAction))
]);
