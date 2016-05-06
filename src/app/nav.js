import {html, forward, Effects, thunk} from 'reflex';
import {merge, tagged, tag} from '../common/prelude';
import * as Unknown from '../common/unknown';
import * as ClassName from '../common/classname';

const RequestRecipes = {
  type: 'RequestRecipes'
};

const RequestNewRecipe = {
  type: 'RequestNewRecipe'
};

export const init = () => [
  {
    selected: 'recipe',
    recipe: {
      id: 'recipe',
      title: 'Recipe'
    },
    library: {
      id: 'library',
      title: 'Library'
    }
  },
  Effects.none
];

export const update = (model, action) =>
  Unknown.update(model, action);

export const view = (model, address) =>
  html.div({
    className: 'nav-main'
  }, [
    html.nav({
      className: 'nav-toolbar'
    }, [
      html.a({
        className: 'nav-current-recipe',
        onClick: () => address(RequestRecipes)
      }),
      html.a({
        className: 'nav-new-recipe',
        onClick: () => address(RequestNewRecipe)
      })
    ])
  ]);
