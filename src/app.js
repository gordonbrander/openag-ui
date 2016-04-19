import {html, forward, Effects} from 'reflex';
import {merge, tag} from './common/prelude';
import * as Unknown from './common/unknown';
import {cursor} from './common/cursor';
import * as Recipes from './recipes';
import * as RecipeForm from './recipe/form';

// Action tagging functions

const RecipeFormAction = tag('RecipeForm');

export const init = () => {
  const [recipeForm, recipeFormFx] = RecipeForm.init();
  const [recipes, recipesFx] = Recipes.init([]);
  return [
    {
      recipeForm,
      recipes
    },
    Effects.batch([
      recipeFormFx,
      recipesFx
    ])
  ];
}

const updateRecipeForm = cursor({
  get: model => model.recipeForm,
  set: (model, recipeForm) => merge(model, {recipeForm}),
  update: RecipeForm.update,
  tag: RecipeFormAction
});

export const update = (model, action) =>
  action.type === 'RecipeForm' ?
  updateRecipeForm(model, action) :
  Unknown.update(model, action);

export const view = (model, address) => html.div({
  className: 'app-main'
}, [
  RecipeForm.view(model.recipeForm, forward(address, RecipeFormAction))
]);
