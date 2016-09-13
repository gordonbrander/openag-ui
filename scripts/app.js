import {html, forward, Effects, thunk} from 'reflex';
import {merge, tagged, tag, batch} from './common/prelude';
import {version} from '../package.json';
import * as Config from '../openag-config.json';
import {localize} from './common/lang';
import * as Unknown from './common/unknown';
import {cursor} from './common/cursor';
import * as Template from './common/stache';
import {readRootUrl} from './common/url';
import * as Request from './common/request';
import * as Banner from './common/banner';
import {classed, toggle} from './common/attr';
import * as Persistence from './persistence';
import * as AppNav from './app/nav';  
import * as Environments from './environments';
import * as Environment from './environment';
import * as Dashboard from './dashboard';
import * as Recipes from './recipes';
import * as Settings from './first-time-use';
import {compose} from './lang/functional';

// State ID is the id of the pouch record we use to persist state.
const STATE_ID = Config.app.state_id;

// Actions and tagging functions

const Configure = value => ({
  type: 'Configure',
  value
});

// Sent when First Run Experience is successfully completed.
const ConfigureFirstTime = form => ({
  type: 'ConfigureFirstTime',
  form
});

// Update address of Food Computer.
const UpdateAddress = url => ({
  type: 'UpdateAddress',
  url
});

const TagFirstTimeUse = action =>
  action.type === 'NotifySubmit' ?
  ConfigureFirstTime(action.form) :
  tagged('FirstTimeUse', action);

const OpenFirstTimeUse = TagFirstTimeUse(Settings.Open);
const CloseFirstTimeUse = TagFirstTimeUse(Settings.Close);

const TagPersistence = action =>
  action.type === 'NotifyRestore' ?
  Configure(action.value) :
  // If we were notified of any errors, forward them to the banner module.
  action.type === 'NotifyBanner' ?
  AlertRefreshableBanner(action.message) :
  action.type === 'NotifyFirstTimeUse' ?
  OpenFirstTimeUse :
  tagged('Persistence', action);

const GetState = TagPersistence(Persistence.GetState);
const PutState = compose(TagPersistence, Persistence.PutState);

// Request a state put.
const SaveState = {type: 'SaveState'};

const TagRecipes = action =>
  action.type === 'RequestStart' ?
  StartRecipe(action.value) :
  tagged('Recipes', action);

const ConfigureRecipes = compose(TagRecipes, Recipes.Configure);

const OpenRecipes = TagRecipes(Recipes.Open);
const CloseRecipes = TagRecipes(Recipes.Close);

const TagEnvironments = action =>
  tagged('Environments', action);

const ConfigureEnvironments = compose(TagEnvironments, Environments.Configure);

const TagEnvironment = action =>
  action.type === 'AlertBanner' ?
  AlertRefreshableBanner(action.source) :
  action.type === 'RequestOpenRecipes' ?
  OpenRecipes :
  tagged('Environment', action);

const ConfigureEnvironment = compose(TagEnvironment, Environment.Configure);
const SetRecipeForEnvironment = compose(TagEnvironment, Environment.SetRecipe);

const TagAppNav = action =>
  tagged('AppNav', action);

const ConfigureAppNav = compose(TagAppNav, AppNav.Configure);

const TagDashboard = action => ({
  type: 'Dashboard',
  source: action
});

const TagBanner = tag('Banner');
const AlertBanner = compose(TagBanner, Banner.Alert);
const AlertRefreshableBanner = compose(TagBanner, Banner.AlertRefreshable);
const AlertDismissableBanner = compose(TagBanner, Banner.AlertRefreshable);

const StartRecipe = value => ({
  type: 'StartRecipe',
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

const RecipePosted = (result) => ({
  type: 'RecipePosted',
  result
});

// Init and update

export const init = () => {
  // @FIXME we hardcode active environment for the moment. This should be
  // kept in an environments db instead.
  const activeEnvironment = Config.active_environment;
  const [environment, environmentFx] = Environment.init(activeEnvironment);
  const [dashboard, dashboardFx] = Dashboard.init();
  const [environments, environmentsFx] = Environments.init();
  const [recipes, recipesFx] = Recipes.init();
  const [appNav, appNavFx] = AppNav.init(AppNav.DASHBOARD);
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
      environment,
      dashboard,
      environments,
      recipes,
      appNav,
      banner,
      firstTimeUse
    },
    Effects.batch([
      Effects.receive(GetState),
      environmentFx.map(TagEnvironment),
      environmentsFx.map(TagEnvironments),
      dashboardFx.map(TagDashboard),
      recipesFx.map(TagRecipes),
      appNavFx.map(TagAppNav),
      bannerFx.map(TagBanner),
      firstTimeUseFx.map(TagFirstTimeUse)
    ])
  ];
}

export const update = (model, action) =>
  action.type === 'Environment' ?
  updateEnvironment(model, action.source) :
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
  action.type === 'Environments' ?
  updateEnvironments(model, action.source) :

  // Specialized update functions
  action.type === 'Configure' ?
  configure(model, action.value) :
  action.type === 'ConfigureFirstTime' ?
  configureFirstTime(model, action.form) :
  action.type === 'StartRecipe' ?
  startRecipe(model, action.value) :
  action.type === 'PostRecipe' ?
  postRecipe(model, action.environmentID, action.recipeID) :
  action.type === 'RecipePosted' ?
  (
    action.result.isOk ?
    recipePostedOk(model, action.result.value) :
    recipePostedError(model, action.result.error)
  ) :
  action.type === 'SaveState' ?
  saveState(model) :
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

const updateEnvironment = cursor({
  get: model => model.environment,
  set: (model, environment) => merge(model, {environment}),
  update: Environment.update,
  tag: TagEnvironment
});

const updateEnvironments = cursor({
  get: model => model.environments,
  set: (model, environments) => merge(model, {environments}),
  update: Environments.update,
  tag: TagEnvironments
});

const startRecipe = (model, recipe) =>
  batch(update, model, [
    SetRecipeForEnvironment(recipe),
    PostRecipe(model.environment.id, recipe._id),
    CloseRecipes
  ]);

const postRecipe = (model, environmentID, recipeID) => {
  const url = Template.render(Config.start_recipe_url, {
    api_url: model.api,
    environment: environmentID
  });

  return [
    model,
    Request.post(url, {recipe_id: recipeID}).map(RecipePosted)
  ];
}

// We do nothing for successful recipe posts. This may change in future.
const recipePostedOk = (model, value) =>
  [model, Effects.none];

const recipePostedError = (model, error) => {
  const message = localize('Food computer was unable to start recipe');
  return update(model, AlertRefreshableBanner(message));
}

const configureFirstTime = (model, form) => {
  // 1. First send configure actions to the module and submodule.
  // 2. Then serialize and store the configuration in PouchDB with Putstate.

  // Construct a faux record of the same shape we would get back from the db.
  const record = serialize({
    // Use any of this information if already on the model (_id and _rev)
    // should be empty.
    _id: model._id,
    _rev: model._rev,
    version: model.version,

    // This comes from the FTU.
    api: form.api,
    origin: form.origin,
    environment: {
      id: form.environment.id,
      name: form.environment.name
    }
  });

  return batch(update, model, [
    // Send the configuration info to in-memory model.
    // This is the action we would typically send after getting back record from
    // local DB.
    Configure(record),
    // Close FTU
    CloseFirstTimeUse,
    // Save updated model to local database.
    SaveState
  ]);
}

const configure = (model, {api, origin, environment}) => {
  // Restore serialized data from stored record.
  // Merge into in-memory app model.
  const next = merge(model, {
    api,
    origin
  });

  return batch(update, next, [
    ConfigureAppNav(environment.name),
    ConfigureEnvironment(environment.id, environment.name, origin),
    ConfigureEnvironments(origin),
    ConfigureRecipes(origin)
  ]);
}

const saveState = model => {
  // Serialize the model and Put it.
  const record = serialize(model);
  return update(model, PutState(record));
}

// Serialize data stored in persistence module.
const serialize = model => ({
  _id: model._id,
  _rev: model._rev,
  version: model.version,
  api: model.api,
  origin: model.origin,
  environment: Environment.serialize(model.environment)
});

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
      forward(address, TagBanner),
      'global-banner'
    ),
    html.div({
      className: 'app-view',
      hidden: toggle(AppNav.active(model.appNav) !== AppNav.DASHBOARD, 'hidden')
    }, [
      thunk(
        'dashboard',
        Dashboard.view,
        model.dashboard,
        forward(address, TagDashboard)
      )
    ]),
    html.div({
      className: 'app-view',
      hidden: toggle(AppNav.active(model.appNav) !== AppNav.CHART, 'hidden')
    }, [
      thunk(
        'environment',
        Environment.view,
        model.environment,
        forward(address, TagEnvironment)
      )
    ]),
    thunk(
      'recipes',
      Recipes.view,
      model.recipes,
      forward(address, TagRecipes)
    )
  ]);