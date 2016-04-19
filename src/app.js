import {html, forward, Effects} from 'reflex';
import * as Recipes from './recipes';
import * as RecipeForm from './recipe/form';

export const init = () => {
  const [recipeForm, recipeFormFx] = RecipeForm.init();
  const [recipes, recipesFx] = Recipes.init([]);
  return [
    {
      recipeForm,
      recipes
    },
    Effects.none
  ];
}

export const update = (model, action) => [model, Effects.none];

export const view = (model, address) => html.div({
  className: 'app-main'
}, [
  RecipeForm.view(model.recipeForm)
]);
