import {html, forward, Effects} from 'reflex';
import {merge, tagged, tag, batch} from './common/prelude';
import * as Config from '../openag-config.json';
import * as Unknown from './common/unknown';
import {cursor} from './common/cursor';
import * as Template from './common/stache';
import * as Request from './common/request';
import * as AppNav from './app/nav';
import * as Banner from './banner';
import * as Environments from './environments';
import * as Recipes from './recipes';
import * as Overlay from './overlay';
import {compose} from './lang/functional';

// Action tagging functions

const RecipesAction = action =>
  action.type === 'Activated' ?
  RecipeActivated(action.value) :
  tagged('Recipes', action);

const EnvironmentsAction = tag('Environments');

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

const BannerAction = tag('Banner');

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
  const [environments, environmentsFx] = Environments.init();
  const [recipes, recipesFx] = Recipes.init();
  const [appNav, appNavFx] = AppNav.init();
  const [banner, bannerFx] = Banner.init();
  const [overlay, overlayFx] = Overlay.init();

  return [
    {
      environments,
      recipes,
      appNav,
      banner,
      overlay
    },
    Effects.batch([
      environmentsFx.map(EnvironmentsAction),
      recipesFx.map(RecipesAction),
      appNavFx.map(AppNavAction),
      bannerFx.map(BannerAction),
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

const updateBanner = cursor({
  get: model => model.banner,
  set: (model, banner) => merge(model, {banner}),
  update: Banner.update,
  tag: BannerAction
});

const updateRecipes = cursor({
  get: model => model.recipes,
  set: (model, recipes) => merge(model, {recipes}),
  update: Recipes.update,
  tag: RecipesAction
});

const updateEnvironments = cursor({
  get: model => model.environments,
  set: (model, environments) => merge(model, {environments}),
  update: Environments.update,
  tag: EnvironmentsAction
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
    PostRecipe(model.environments.active, recipe._id),
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
  action.type === 'Environments' ?
  updateEnvironments(model, action.source) :
  action.type === 'Recipes' ?
  updateRecipes(model, action.source) :
  action.type === 'AppNav' ?
  updateAppNav(model, action.source) :
  action.type === 'Banner' ?
  updateBanner(model, action.source) :
  action.type === 'Overlay' ?
  updateOverlay(model, action.source) :
  // Specialized update functions
  action.type === 'RecipeActivated' ?
  recipeActivated(model, action.value) :
  action.type === 'PostRecipe' ?
  postRecipe(model, action.environmentID, action.recipeID) :
  action.type === 'Posted' ?
  [model, Effects.none] :
  action.type === 'EnterRecipesMode' ?
  enterRecipesMode(model) :
  action.type === 'ExitRecipesMode' ?
  exitRecipesMode(model) :
  Unknown.update(model, action);

export const view = (model, address) => html.div({
  className: 'app-main'
}, [
  AppNav.view(model.appNav, forward(address, AppNavAction)),
  Banner.view(model.banner, forward(address, BannerAction)),
  Environments.view(
    model.environments,
    forward(address, EnvironmentsAction)
  ),
  Overlay.view(model.overlay, forward(address, OverlayAction)),
  Recipes.view(model.recipes, forward(address, RecipesAction))
]);
