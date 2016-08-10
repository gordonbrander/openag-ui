import {html, forward, Effects, thunk} from 'reflex';
import {merge, tagged, tag, batch} from './common/prelude';
import {version} from '../package.json';
import * as Config from '../openag-config.json';
import * as Unknown from './common/unknown';
import {cursor} from './common/cursor';
import * as Template from './common/stache';
import {readRootUrl} from './common/url';
import * as Request from './common/request';
import * as Persistence from './persistence';
import * as AppNav from './app/nav';
import * as Banner from './banner';
import * as Environments from './environments';
import * as Recipes from './recipes';
import * as Settings from './first-time-use';
import {compose} from './lang/functional';

// State ID is the id of the pouch record we use to persist state.
const STATE_ID = Config.app.state_id;

// Actions and tagging functions

const Restore = value => ({
  type: 'Restore',
  value
});

const Heartbeat = url => ({
  type: 'Heartbeat',
  url
});

// Update address of Food Computer.
const UpdateAddress = url => ({
  type: 'UpdateAddress',
  url
});

const TagFirstTimeUse = action =>
  action.type === 'NotifyHeartbeat' ?
  Heartbeat(action.url) :
  tagged('FirstTimeUse', action);

const OpenFirstTimeUse = TagFirstTimeUse(Settings.Open);
const CloseFirstTimeUse = TagFirstTimeUse(Settings.Close);

const TagPersistence = action =>
  action.type === 'NotifyRestore' ?
  Restore(action.value) :
  // If we were notified of any errors, forward them to the banner module.
  action.type === 'NotifyBanner' ?
  AlertBannerWithRefresh(action.message) :
  action.type === 'NotifyFirstTimeUse' ?
  OpenFirstTimeUse :
  tagged('Persistence', action);

const GetState = TagPersistence(Persistence.GetState);
const PutState = compose(TagPersistence, Persistence.PutState);

const TagRecipes = action =>
  action.type === 'Activated' ?
  RecipeActivated(action.value) :
  tagged('Recipes', action);

const RestoreRecipes = compose(TagRecipes, Recipes.Restore);

const TagEnvironments = action =>
  action.type === 'AlertBanner' ?
  AlertBannerWithRefresh(action.source) :
  action.type === 'SuppressBanner' ?
  SuppressBanner :
  tagged('Environments', action);

const RestoreEnvironments = compose(TagEnvironments, Environments.Restore);

const OpenRecipes = TagRecipes(Recipes.Open);
const CloseRecipes = TagRecipes(Recipes.Close);

const TagAppNav = action =>
  action.type === 'RequestRecipes' ?
  OpenRecipes :
  tagged('AppNav', action);

const TagBanner = tag('Banner');
const AlertBanner = compose(TagBanner, Banner.Alert);
const AlertBannerWithRefresh = compose(TagBanner, Banner.AlertWithRefresh);
const SuppressBanner = TagBanner(Banner.Suppress);

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

const ChangeAppNavRecipeTitle = compose(TagAppNav, AppNav.ChangeRecipeTitle);

// Init and update

export const init = () => {
  const [environments, environmentsFx] = Environments.init();
  const [recipes, recipesFx] = Recipes.init();
  const [appNav, appNavFx] = AppNav.init();
  const [banner, bannerFx] = Banner.init();
  const [firstTimeUse, firstTimeUseFx] = Settings.init();

  return [
    {
      // Tag model with _id and _rev for PouchDB. Handled in persistence module
      // update function.
      // _id is used to retreive the app state record.
      _id: STATE_ID,
      // These fields are restored from the local PouchDB settings database.
      _rev: null,
      api: null,
      origin: null,
      // Tag model with version from package.json. We use this with
      // persistence module to make sure we're loading a state in a schema
      // we understand.
      version,

      // Store submodule states.
      environments,
      recipes,
      appNav,
      banner,
      firstTimeUse
    },
    Effects.batch([
      Effects.receive(GetState),
      environmentsFx.map(TagEnvironments),
      recipesFx.map(TagRecipes),
      appNavFx.map(TagAppNav),
      bannerFx.map(TagBanner),
      firstTimeUseFx.map(TagFirstTimeUse)
    ])
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
  action.type === 'Restore' ?
  restore(model, action.value) :
  action.type === 'Heartbeat' ?
  updateHeartbeat(model, action.url) :
  action.type === 'RecipeActivated' ?
  recipeActivated(model, action.value) :
  action.type === 'PostRecipe' ?
  postRecipe(model, action.environmentID, action.recipeID) :
  action.type === 'Posted' ?
  [model, Effects.none] :
  Unknown.update(model, action);

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
  tag: TagAppNav
});

const updateBanner = cursor({
  get: model => model.banner,
  set: (model, banner) => merge(model, {banner}),
  update: Banner.update,
  tag: TagBanner
});

const updateRecipes = cursor({
  get: model => model.recipes,
  set: (model, recipes) => merge(model, {recipes}),
  update: Recipes.update,
  tag: TagRecipes
});

const updateEnvironments = cursor({
  get: model => model.environments,
  set: (model, environments) => merge(model, {environments}),
  update: Environments.update,
  tag: TagEnvironments
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
    api_url: model.api,
    environment: environmentID
  });

  return [
    model,
    Request.post(url, {data: recipeID})
  ];
}

const updateHeartbeat = (model, url) => {
  const rootUrl = readRootUrl(url);

  // First, update the URL in the model
  const next = merge(model, {
    api: Template.render(Config.api, {
      root_url: rootUrl
    }),
    origin: Template.render(Config.origin, {
      root_url: rootUrl
    })
  });

  const record = serialize(next);

  return batch(update, next, [
    CloseFirstTimeUse,
    // Send the settings info to in-memory model
    Restore(record),
    // Save settings info to local database
    PutState(record)
  ]);
}

// Serialize and deserialize data stored in persistence module.
const serialize = model => ({
  _id: model._id,
  _rev: model._rev,
  version: model.version,
  api: model.api,
  origin: model.origin
});

const restore = (model, record) => {
  // Restore serialized data from stored record.
  // Merge into in-memory app model.
  const next = merge(model, record);

  return batch(update, next, [
    RestoreEnvironments(record),
    RestoreRecipes(record)
  ]);
}

// View

export const view = (model, address) =>
  model.origin ?
  viewConfigured(model, address) :
  viewFTU(model, address);

const viewFTU = (model, address) =>
  html.div({
    className: 'app-main'
  }, [
    thunk(
      'first-time-use',
      Settings.viewFTU,
      model.firstTimeUse,
      forward(address, TagFirstTimeUse)
    )
  ]);

const viewConfigured = (model, address) =>
  html.div({
    className: 'app-main app-main--ready'
  }, [
    thunk(
      'app-nav',
      AppNav.view,
      model.appNav,
      forward(address, TagAppNav)
    ),
    thunk(
      'banner',
      Banner.view,
      model.banner,
      forward(address, TagBanner)
    ),
    thunk(
      'environments',
      Environments.view,
      model.environments,
      forward(address, TagEnvironments)
    ),
    thunk(
      'recipes',
      Recipes.view,
      model.recipes,
      forward(address, TagRecipes)
    )
  ]);