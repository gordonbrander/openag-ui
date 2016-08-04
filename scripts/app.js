import {html, forward, Effects, thunk} from 'reflex';
import {merge, tagged, tag, batch} from './common/prelude';
import * as Config from '../openag-config.json';
import * as Unknown from './common/unknown';
import {cursor} from './common/cursor';
import * as Template from './common/stache';
import * as Request from './common/request';
import * as Persistence from './persistence';
import * as AppNav from './app/nav';
import * as Banner from './banner';
import * as Environments from './environments';
import * as Recipes from './recipes';
import * as Settings from './first-time-use';
import {compose} from './lang/functional';

// Actions and tagging functions

const Restore = value => ({
  type: 'Restore',
  value
});

const TagFirstTimeUse = tag('FirstTimeUse');

const OpenFirstTimeUse = TagFirstTimeUse(Settings.Open);

const TagPersistence = action =>
  action.type === 'NotifyRestore' ?
  Restore(action.value) :
  action.type === 'NotifyFirstTimeUse' ?
  OpenFirstTimeUse :
  tagged('Persistence', action);

const GetState = TagPersistence(Persistence.GetState);

const RecipesAction = action =>
  action.type === 'Activated' ?
  RecipeActivated(action.value) :
  tagged('Recipes', action);

const EnvironmentsAction = action =>
  action.type === 'AlertBanner' ?
  AlertBannerWithRefresh(action.source) :
  action.type === 'SuppressBanner' ?
  SuppressBanner :
  tagged('Environments', action);

const OpenRecipes = RecipesAction(Recipes.Open);
const CloseRecipes = RecipesAction(Recipes.Close);

const AppNavAction = action =>
  action.type === 'RequestRecipes' ?
  OpenRecipes :
  tagged('AppNav', action);

const BannerAction = tag('Banner');
const AlertBanner = compose(BannerAction, Banner.Alert);
const AlertBannerWithRefresh = compose(BannerAction, Banner.AlertWithRefresh);
const SuppressBanner = BannerAction(Banner.Suppress);

const RecipeActivated = value => ({
  type: 'RecipeActivated',
  value
});

const CreateRecipe = recipe => ({
  type: 'CreateRecipe',
  recipe
});

const PostRecipe = (environmentID, recipeID) => ({
  type: 'PostRecipe',
  recipeID,
  environmentID
});

const ChangeAppNavRecipeTitle = compose(AppNavAction, AppNav.ChangeRecipeTitle);

// Init and update

export const init = () => {
  const [environments, environmentsFx] = Environments.init();
  const [recipes, recipesFx] = Recipes.init();
  const [appNav, appNavFx] = AppNav.init();
  const [banner, bannerFx] = Banner.init();
  const [firstTimeUse, firstTimeUseFx] = Settings.init();

  return [
    {
      environments,
      recipes,
      appNav,
      banner,
      firstTimeUse
    },
    Effects.batch([
      Effects.receive(GetState),
      environmentsFx.map(EnvironmentsAction),
      recipesFx.map(RecipesAction),
      appNavFx.map(AppNavAction),
      bannerFx.map(BannerAction),
      firstTimeUseFx.map(TagFirstTimeUse)
    ])
  ];
}

const updatePersistence = cursor({
  update: Persistence.update,
  tag: TagPersistence
});

const updateFirstTimeUse = cursor({
  get: model => model.firstTimeUse,
  set: (model, firstTimeUse) => merge(model, {firstTimeUse}),
  update: Settings.update,
  tag: TagFirstTimeUse
});

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

const recipeActivated = (model, recipe) =>
  batch(update, model, [
    ChangeAppNavRecipeTitle(recipe.title),
    // @TODO bring environments up a level
    PostRecipe(model.environments.active, recipe._id),
    CloseRecipes
  ]);

const postRecipe = (model, environmentID, recipeID) => {
  const url = Template.render(Config.start_recipe_url, {
    api_url: Config.api_url,
    environment: environmentID
  });

  return [
    model,
    Request.post(url, {data: recipeID})
  ];
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
  action.type === 'Persistence' ?
  updatePersistence(model, action.source) :
  action.type === 'FirstTimeUse' ?
  updateFirstTimeUse(model, action.source) :
  // Specialized update functions
  action.type === 'RecipeActivated' ?
  recipeActivated(model, action.value) :
  action.type === 'PostRecipe' ?
  postRecipe(model, action.environmentID, action.recipeID) :
  action.type === 'Posted' ?
  [model, Effects.none] :
  Unknown.update(model, action);

export const view = (model, address) => html.div({
  className: 'app-main'
}, [
  thunk(
    'app-nav',
    AppNav.view,
    model.appNav,
    forward(address, AppNavAction)
  ),
  thunk(
    'banner',
    Banner.view,
    model.banner,
    forward(address, BannerAction)
  ),
  thunk(
    'environments',
    Environments.view,
    model.environments,
    forward(address, EnvironmentsAction)
  ),
  thunk(
    'recipes',
    Recipes.view,
    model.recipes,
    forward(address, RecipesAction)
  ),
  thunk(
    'first-time-use',
    Settings.viewFTU,
    model.firstTimeUse,
    forward(address, TagFirstTimeUse)
  )
]);
