import {html, forward, Effects} from 'reflex';
import * as Recipes from '../recipes';

export const init = () => [
  {
    isOpen: true
  },
  Effects.none
];

// Submitting the form
const Submit = {type: 'Submit'};

//export const update (model, action) =>
  //action.type === 'Submit' ?
    //Recipes.update()

export const view = (model, address) =>
  html.dialog({
    className: 'rform-main',
    open: (model.isOpen ? 'open' : null)
  }, [
    html.textarea({
      className: 'rform-textarea',
      onSubmit: event => address(Submit)
    }),
    html.footer()
  ]);
