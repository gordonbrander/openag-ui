import {html, forward, Effects} from 'reflex';
import {merge, tagged, tag} from './common/prelude';
import * as Unknown from './common/unknown';
import {cursor} from './common/cursor';
import * as EnvironmentalDataPoint from './environmental-data-point';
import * as Recipes from './recipes';
import * as RecipeForm from './recipe/form';

// Actions

const CreateRecipe = operations => ({
  type: 'CreateRecipe',
  operations
});

// Action tagging functions

const RecipesAction = tag('Recipes');
const EnvironmentalDataPointAction = tag('EnvironmentalDataPoint');

const RecipeFormAction = action =>
  action.type === 'Create' ?
  CreateRecipe(create.operations) :
  tagged('RecipeForm', action);

// Init and update

export const init = () => {
  const [environmentalDataPoint, environmentalDataPointFx] =
    EnvironmentalDataPoint.init();
  const [recipeForm, recipeFormFx] = RecipeForm.init();
  const [recipes, recipesFx] = Recipes.init([]);

  return [
    {
      environmentalDataPoint,
      recipeForm,
      recipes
    },
    Effects.batch([
      environmentalDataPointFx.map(EnvironmentalDataPointAction),
      recipeFormFx.map(RecipeFormAction),
      recipesFx.map(RecipesAction)
    ])
  ];
}

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

export const update = (model, action) =>
  action.type === 'EnvironmentalDataPoint' ?
  updateEnvironmentalDataPoint(model, action.source) :
  //action.type === 'CreateRecipe' ?
  //updateRecipes(model, Recipes.Create(action.operations)) :
  action.type === 'RecipeForm' ?
  updateRecipeForm(model, action.source) :
  Unknown.update(model, action);

export const view = (model, address) => html.div({
  className: 'app-main'
}, [
  EnvironmentalDataPoint.view(
    model.environmentalDataPoint,
    forward(address, EnvironmentalDataPointAction)
  ),
  RecipeForm.view(model.recipeForm, forward(address, RecipeFormAction))
]);
