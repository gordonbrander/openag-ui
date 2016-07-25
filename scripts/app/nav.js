import {html, forward, Effects, thunk} from 'reflex';
import {merge, tagged, tag} from '../common/prelude';
import * as Unknown from '../common/unknown';
import * as ClassName from '../common/classname';

const RequestRecipes = {
  type: 'RequestRecipes'
};

export const ChangeRecipeTitle = value => ({
  type: 'ChangeRecipeTitle',
  value
});

export const init = () => [
  {
    recipeTitle: 'Salinas Valley in Fall'
  },
  Effects.none
];

export const update = (model, action) =>
  action.type === 'ChangeRecipeTitle' ?
  [merge(model, {recipeTitle: action.value}), Effects.none] :
  Unknown.update(model, action);

const readTitle = model =>
  typeof model.recipeTitle === 'string' ?
  model.recipeTitle :
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
          'nav-chart-icon': true,
          'nav-chart-icon-active': true
        })
      })
    ])
  ]);
