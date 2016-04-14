import {html, forward, Effects} from 'reflex';

export const init = () => [
  {
    foo: 'bar'
  },
  Effects.none
];

export const update = (model, action) => [model, Effects.none];

export const view = (model, address) => html.div();
