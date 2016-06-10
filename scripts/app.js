import {html, forward, Effects} from 'reflex';
import {merge, tagged, tag, batch} from './common/prelude';
import * as Config from '../openag-config.json';
import * as Unknown from './common/unknown';
import {cursor} from './common/cursor';
import * as Template from './common/stache';
import * as Request from './common/request';
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

const ResetEnvironmentalDataPoints =
  EnvironmentalDataPointsAction(EnvironmentalDataPoints.Reset);

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

const PostRecipe = (environmentID, recipeID) => ({
  type: 'PostRecipe',
  recipeID,
  environmentID
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

const ChangeAppNavRecipeTitle = compose(AppNavAction, AppNav.ChangeRecipeTitle);

// Init and update

export const init = () => {
  const [environmentalDataPoints, environmentalDataPointsFx] =
    EnvironmentalDataPoints.init();
  const [recipes, recipesFx] = Recipes.init();
  const [appNav, appNavFx] = AppNav.init();
  const [overlay, overlayFx] = Overlay.init();

  return [
    {
      environmentalDataPoints,
      recipes,
      appNav,
      overlay
    },
    Effects.batch([
      environmentalDataPointsFx.map(EnvironmentalDataPointsAction),
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
  get: model => model.environmentalDataPoints,
  set: (model, environmentalDataPoints) => merge(model, {environmentalDataPoints}),
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
  batch(update, model, [
    ChangeAppNavRecipeTitle(recipe.title),
    // @TODO bring environments up a level
    PostRecipe(model.environmentalDataPoints.environments.active, recipe._id),
    CloseRecipes,
    CloseOverlay
  ]);

const postRecipe = (model, environmentID, recipeID) => {
  const url = Template.render(Config.start_recipe_url, {
    api_url: Config.api_url,
    environment: environmentID
  });
  return Request.post(model, url, {
    data: recipeID
  });
}

export const update = (model, action) =>
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
  action.type === 'PostRecipe' ?
  postRecipe(model, action.environmentID, action.recipeID) :
  action.type === 'Posted' ?
  (
    action.result.isOk ?
    update(model, ResetEnvironmentalDataPoints) :
    [model, Effects.none]
  ) :
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
    model.environmentalDataPoints,
    forward(address, EnvironmentalDataPointsAction)
  ),
  Overlay.view(model.overlay, forward(address, OverlayAction)),
  Recipes.view(model.recipes, forward(address, RecipesAction))
]);
