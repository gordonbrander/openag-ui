import {html} from 'reflex';

export const Activate = {
  type: 'Activate'
};

export const view = (model, address) =>
  html.div({
    className: 'recipe',
    onClick: () => address(Activate)
  }, [
    String(model._id)
  ]);
