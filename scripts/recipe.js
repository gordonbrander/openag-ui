import {html} from 'reflex';
import {port} from './common/prelude';

// Action

export const Activate = {
  type: 'Activate'
};

// Model
export class Model {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
}

export const fromDoc = doc => new Model(doc._id, readRecipeName(doc));

// View

export const view = (model, address) => {
  const sendPoint = onPoint(address);
  return html.li(null, [
    html.div({
      className: 'menu-list-control',
      onTouchStart: sendPoint,
      onMouseDown: sendPoint
    }, [
      model.name
    ])
  ]);
}

const onPoint = port(event => {
  event.preventDefault();
  return Activate;
});

// Utils

// Read name from model, or use fallback.
const readRecipeName = recipe =>
  String(recipe.name || recipe.value || recipe._id);