import {html, forward, Effects, thunk} from 'reflex';
import {merge, tagged, tag} from '../common/prelude';
import * as Unknown from '../common/unknown';
import * as ClassName from '../common/classname';

const RequestNewRecipe = {
  type: 'RequestNewRecipe'
};

export const Select = value => ({
  type: 'Select',
  value
});

export const Selected = value => ({
  type: 'Selected',
  value
});

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
  action.type === 'Select' && action.value === 'recipe' ?
  [
    merge(model, {selected: 'recipe'}),
    Effects.receive(Selected(action.value))
  ] :
  action.type === 'Select' && action.value === 'library' ?
  [
    merge(model, {selected: 'library'}),
    Effects.receive(Selected(action.value))
  ] :
  Unknown.update(model, action);

const viewTab = ({id, title}, address, isSelected) =>
  html.a({
    className: ClassName.create({
      'gnav-tab': true,
      'gnav-tab-selected': isSelected
    }),
    onClick: () => address(Select(id))
  }, [
    title
  ]);

export const view = (model, address) =>
  html.header({
    className: 'app-header'
  }, [
    html.nav({
      className: 'gnav-main'
    }, [
      // @TODO rather than passing a 3rd argument, we should pass an action
      // to a sub-module. Do this when we have generalized byID model code.
      thunk('recipe', viewTab, model.recipe, address, model.selected === 'recipe'),
      thunk('library', viewTab, model.library, address, model.selected === 'library'),
      html.a({
        className: 'gnav-new-recipe',
        onClick: () => address(RequestNewRecipe)
      })
    ])
  ]);
