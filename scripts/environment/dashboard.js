/*
The dashboard displays the latest camera information from the Food Computer.
*/
import {html, forward, Effects, thunk} from 'reflex';
import {merge} from '../common/prelude';
import {update as updateUnknown} from '../common/unknown';

// Actions

export const SetRecipeStart = id => ({
  type: 'SetRecipeStart',
  id
});

// Init and update

export const init = () => [
  {
    recipeStart: null
  },
  Effects.none
];

export const update = (model, action) =>
  action.type === 'SetRecipeStart' ?
  [merge(model, {id: action.id}), Effects.none] :
  updateUnknown(model, action);

export const view = (model, address) =>
  html.div({
    className: 'dashboard'
  }, [
    'Hi!'
  ]);