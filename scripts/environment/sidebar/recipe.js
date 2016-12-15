import {html, forward, Effects, Task, thunk} from 'reflex';
import {merge, annotate, port} from '../../common/prelude';
import {localize} from '../../common/lang';
import {update as updateUnknown} from '../../common/unknown';

// Actions

export const RequestOpenRecipes = {
  type: 'RequestOpenRecipes'
};

// Set the recipe
export const SetRecipe = (id, name) => ({
  type: 'SetRecipe',
  id,
  name
});

// Model, init, update

// Empty model that we can re-use.
const Empty = Object.freeze({
  id: null,
  name: null
});

export const init = () => [
  // Initialize in empty state
  Empty,
  Effects.none
];

export const update = (model, action) =>
  action.type === 'SetRecipe' ?
  setRecipe(model, action.id, action.name) :
  updateUnknown(model, action);

const setRecipe = (model, id, name) => [
  merge(model, {
    id,
    name
  }),
  Effects.none
];

// View

export const view = (model, address) =>
  html.div({
    className: 'current-recipe'
  }, [
    html.div({
      className: 'current-recipe--label'
    }, [
      localize('Recipe')
    ]),
    html.a({
      className: 'current-recipe--name',
      onTouchStart: onPointStart(address),
      onMouseDown: onPointStart(address)
    }, [
      readName(model)
    ])
  ])

const onPointStart = port(event => {
  // Prevent event from bubbling. This prevents touch events from
  // transmogrifying into click events in iOS.
  event.preventDefault();
  return RequestOpenRecipes;
});

// Read name from model, or use fallback.
const readName = model =>
  model.name ? model.name : localize('None');
