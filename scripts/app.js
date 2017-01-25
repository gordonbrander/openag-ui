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
import {classed} from './common/attr';
import * as AppNav from './app/nav';  
import * as Environments from './environments';
import * as Environment from './environment';
import * as Recipes from './recipes';
import {compose} from './lang/functional';

const _url_template = {root_url: Config.root_url}
const API_URL = Template.render(Config.api_url, _url_template);
const ORIGIN_URL = Template.render(Config.origin_url, _url_template);
// @FIXME we hardcode active environment for the moment. This works because
// personal food computers manage just one environment. This should be
// kept in the app state instead. We can pick a default, but let the user
// choose between environments when there is only one.
const ENVIRONMENT_ID = Config.environments.default.id;
const ENVIRONMENT_NAME = Config.environments.default.name;

// Actions and tagging functions

const Configure = value => ({
  type: 'Configure',
  value
});

// Update address of Food Computer.
const UpdateAddress = url => ({
  type: 'UpdateAddress',
  url
});

const TagRecipes = action =>
  action.type === 'RequestStart' ?
  StartRecipe(action.id, action.name) :
  action.type === 'RequestStopStart' ?
  StopStartRecipe(action.id, action.name) :
  tagged('Recipes', action);

const ConfigureRecipes = compose(TagRecipes, Recipes.Configure);

const OpenRecipes = TagRecipes(Recipes.Open);
const CloseRecipes = TagRecipes(Recipes.Close);

const TagEnvironments = action =>
  tagged('Environments', action);

const ConfigureEnvironments = compose(TagEnvironments, Environments.Configure);

const TagEnvironment = action =>
  action.type === 'AlertBanner' ?
  AlertDismissableBanner(action.source) :
  action.type === 'RequestOpenRecipes' ?
  OpenRecipes :
  EnvironmentAction(action);

const EnvironmentAction = action => ({
  type: 'Environment',
  source: action
})

const ConfigureEnvironment = compose(EnvironmentAction, Environment.Configure);
const SetRecipeForEnvironment = compose(EnvironmentAction, Environment.SetRecipe);
const ActivateEnvironmentState = compose(EnvironmentAction, Environment.ActivateState);

const TagAppNav = action =>
  action.type === 'ActivateState' ?
  ActivateState(action.id) :
  AppNavAction(action);

const AppNavAction = action => ({
  type: 'AppNav',
  source: action
});

const ActivateAppNavState = compose(AppNavAction, AppNav.ActivateState);

// Action sent to configure top level app state.
// Driven by AppNav.Activate actions.
const ActivateState = id => ({
  type: 'ActivateState',
  id
});

const ConfigureAppNav = compose(TagAppNav, AppNav.Configure);

const TagBanner = tag('Banner');
const AlertDismissableBanner = compose(TagBanner, Banner.AlertDismissable);
const NotifyBanner = compose(TagBanner, Banner.Notify);

const StartRecipe = (id, name) => ({
  type: 'StartRecipe',
  id,
  name
});

const StopStartRecipe = (id, name) => ({
  type: 'StopStartRecipe',
  id,
  name
});

const CreateRecipe = recipe => ({
  type: 'CreateRecipe',
  recipe
});

const PostStartRecipe = (environmentID, recipeID) => ({
  type: 'PostStartRecipe',
  recipeID,
  environmentID
});

const PostStopStartRecipe = (environmentID, recipeID) => ({
  type: 'PostStopStartRecipe',
  recipeID,
  environmentID
});

const RecipeStartPosted = (result) => ({
  type: 'RecipeStartPosted',
  result,
});

const RecipeStopStartPosted = (result) => ({
  type: 'RecipeStopStartPosted',
  result
});

// Init and update

export const init = () => {
  const navState = Config.app_nav.default_state;
  const [environment, environmentFx] = Environment.init(ENVIRONMENT_ID, navState);
  const [environments, environmentsFx] = Environments.init();
  const [recipes, recipesFx] = Recipes.init();
  const [appNav, appNavFx] = AppNav.init(navState);
  const [banner, bannerFx] = Banner.init();

  // Create configure action. We'll send this below.
  // It passes the API and origin down to submodules, so they can make
  // http calls to them.
  const configure = Configure({
    api: API_URL,
    origin: ORIGIN_URL,
    environmentID: ENVIRONMENT_ID,
    environmentName: ENVIRONMENT_NAME
  });

  return [
    {
      api: API_URL,
      origin: ORIGIN_URL,

      // Store submodule states.
      environment,
      environments,
      recipes,
      appNav,
      banner
    },
    Effects.batch([
      Effects.receive(configure),
      environmentFx.map(TagEnvironment),
      environmentsFx.map(TagEnvironments),
      recipesFx.map(TagRecipes),
      appNavFx.map(TagAppNav),
      bannerFx.map(TagBanner)
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
  action.type === 'Environments' ?
  updateEnvironments(model, action.source) :

  // Specialized update functions
  action.type === 'ActivateState' ?
  activateState(model, action.id) :
  action.type === 'Configure' ?
  configure(model, action.value) :
  action.type === 'StartRecipe' ?
  startRecipe(model, action.id, action.name) :
  action.type === 'StopStartRecipe' ?
  stopStartRecipe(model, action.id, action.name) :
  action.type === 'PostStartRecipe' ?
  postStartRecipe(model, action.environmentID, action.recipeID) :
  action.type === 'PostStopStartRecipe' ?
  postStopStartRecipe(model, action.environmentID, action.recipeID) :
  action.type === 'RecipeStopStartPosted' ?
  (
    // don't care for stop_recipe results, just try to start a new one
    postStartRecipe(model, model.environment.id, model.recipes.active)
  ) :
  action.type === 'RecipeStartPosted' ?
  (
    action.result.isOk ?
    recipePostedOk(model, action.result.value) :
    recipePostedError(model, action.result.error)
  ) :
  action.type === 'SaveState' ?
  saveState(model) :
  Unknown.update(model, action);

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

const activateState = (model, id) =>
  // Forward activate action we hijacked to app nav.
  batch(update, model, [
    ActivateAppNavState(id),
    ActivateEnvironmentState(id)
  ]);

const startRecipe = (model, id, name) =>
  batch(update, model, [
    PostStartRecipe(model.environment.id, id),
    SetRecipeForEnvironment(id, name),
    CloseRecipes
  ]);

const stopStartRecipe = (model, id, name) =>
  batch(update, model, [
    PostStopStartRecipe(model.environment.id, id),
    SetRecipeForEnvironment(id, name),
    CloseRecipes
  ]);

const postStartRecipe = (model, environmentID, recipeID) => {
  const url = Template.render(Config.start_recipe_url, {
    api_url: model.api,
    environment: environmentID
  });

  return [
    model,
    Request.post(url, [recipeID]).map(RecipeStartPosted)
  ];
}

const postStopStartRecipe = (model, environmentID, id) => {
  const url = Template.render(Config.stop_recipe_url, {
    api_url: model.api,
    environment: environmentID
  });

  return [
    model,
    Request.post(url, {}).map(RecipeStopStartPosted)
  ];
}

const recipePostedOk = (model, value) => {
  const message = localize('Recipe started!');
  return update(model, NotifyBanner(message));
}

const recipePostedError = (model, error) => {
  const message = localize('Food computer was unable to start recipe');
  return update(model, AlertDismissableBanner(message));
}

const configure = (model, {api, origin, environmentID, environmentName}) => {
  // Restore serialized data from stored record.
  // Merge into in-memory app model.
  const next = merge(model, {
    api,
    origin
  });

  return batch(update, next, [
    ConfigureAppNav(environmentName),
    ConfigureEnvironment(environmentID, environmentName, api, origin),
    ConfigureEnvironments(origin),
    ConfigureRecipes(origin)
  ]);
}

// View

export const view = (model, address) => {
  const children = [
    thunk(
      'banner',
      Banner.view,
      model.banner,
      forward(address, TagBanner),
      'global-banner'
    ),
    thunk(
      'environment',
      Environment.view,
      model.environment,
      forward(address, TagEnvironment)
    ),
    thunk(
      'recipes',
      Recipes.view,
      model.recipes,
      forward(address, TagRecipes)
    )
  ];

  // Include app nav if needed
  if (Config.app_nav.display) {
    children.unshift(thunk(
      'app-nav',
      AppNav.view,
      model.appNav,
      forward(address, TagAppNav)
    ))
  }

  return html.div({
    className: classed({
      'app-main': true,
      'app-main--ready': true,
      'app--has-nav': Config.app_nav.display
    })
  }, children);
};
