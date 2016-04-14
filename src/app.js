import {html, forward, Effects} from 'reflex';

export const init = () => ({
  foo: 'bar'
});

export const update = (model, action) => model;

export const view = (model, address) => html.div();
