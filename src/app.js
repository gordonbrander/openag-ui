import {html, forward, Effects} from 'reflex';
import {merge, tagged, tag} from './common/prelude';
import * as Unknown from './common/unknown';
import {cursor} from './common/cursor';
import * as AppHeader from './app/header';
import * as EnvironmentalDataPoint from './environmental-data-point';
import * as Recipes from './recipes';
import * as RecipeForm from './recipe/form';
import * as Overlay from './overlay';

// Actions

const CreateRecipe = operations => ({
  type: 'CreateRecipe',
  operations
});

const RequestOpenRecipeForm = {
  type: 'RequestOpenRecipeForm'
};

const RequestCloseRecipeForm = {
  type: 'RequestCloseRecipeForm'
};

// Action tagging functions

const RecipesAction = tag('Recipes');
const EnvironmentalDataPointAction = tag('EnvironmentalDataPoint');

const OverlayAction = action =>
  action.type === 'Click' ?
  RequestCloseRecipeForm :
  tagged('Overlay', action);

const AppHeaderAction = action =>
  action.type === 'RequestNewRecipe' ?
  RequestOpenRecipeForm :
  tagged('RecipeForm', action);

const RecipeFormAction = action =>
  action.type === 'Create' ?
  CreateRecipe(action.operations) :
  action.type === 'Cancel' ?
  RequestCloseRecipeForm :
  tagged('RecipeForm', action);

// Init and update

export const init = () => {
  const [environmentalDataPoint, environmentalDataPointFx] =
    EnvironmentalDataPoint.init();
  const [recipeForm, recipeFormFx] = RecipeForm.init();
  const [recipes, recipesFx] = Recipes.init([]);
  const [overlay, overlayFx] = Overlay.init();

  return [
    {
      environmentalDataPoint,
      recipeForm,
      recipes,
      overlay
    },
    Effects.batch([
      environmentalDataPointFx.map(EnvironmentalDataPointAction),
      recipeFormFx.map(RecipeFormAction),
      recipesFx.map(RecipesAction),
      overlayFx.map(OverlayAction)
    ])
  ];
}

const updateAppHeader = cursor({
  get: model => model.header,
  set: (model, header) => merge(model, {header}),
  update: AppHeader.update,
  tag: AppHeaderAction
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

export const update = (model, action) =>
  action.type === 'EnvironmentalDataPoint' ?
  updateEnvironmentalDataPoint(model, action.source) :
  //action.type === 'CreateRecipe' ?
  //updateRecipes(model, Recipes.Create(action.operations)) :
  action.type === 'RecipeForm' ?
  updateRecipeForm(model, action.source) :
  action.type === 'Overlay' ?
  updateOverlay(model, action.source) :
  action.type === 'RequestOpenRecipeForm' ?
  openRecipeForm(model) :
  action.type === 'RequestCloseRecipeForm' ?
  closeRecipeForm(model) :
  Unknown.update(model, action);

export const view = (model, address) => html.div({
  className: 'app-main'
}, [
  AppHeader.view(model, forward(address, AppHeaderAction)),
  EnvironmentalDataPoint.view(
    model.environmentalDataPoint,
    forward(address, EnvironmentalDataPointAction)
  ),
  Overlay.view(model.overlay, forward(address, OverlayAction)),
  RecipeForm.view(model.recipeForm, forward(address, RecipeFormAction))
]);
