import {html, forward, Effects, thunk} from 'reflex';
import {merge, tagged, tag} from '../common/prelude';
import * as Unknown from '../common/unknown';
import * as ClassName from '../common/classname';

const RequestRecipes = {
  type: 'RequestRecipes'
};

export const ChangeRecipe = value => ({
  type: 'ChangeRecipe',
  value
});

export const init = () => [
  {
    recipe: {
      title: 'Salinas Valley in Fall'
    },
  },
  Effects.none
];

export const update = (model, action) =>
  action.type === 'ChangeRecipe' ?
  [merge(model, {recipe: action.value}), Effects.none] :
  Unknown.update(model, action);

const readTitle = model =>
  typeof model.recipe.title === 'string' ?
  model.recipe.title :
  // @TODO localize this
  'Untitled';

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
      }, [
        html.span({
          className: 'nav-current-recipe-label'
        }, [
          'Current Recipe'
        ]),
        html.span({
          className: 'nav-current-recipe-title'
        }, [
          readTitle(model)
        ])
      ]),
      html.a({
        className: ClassName.create({
          'nav-dashboard-icon': true,
          'nav-dashboard-icon-active': true
        })
      })
    ])
  ]);
