// @note this file is probably temporary, since authoring recipe JSON by
// hand is a pain.

import {html, forward, Effects} from 'reflex';
import * as Unknown from '../common/unknown';
import * as Recipes from '../recipes';

export const init = () => [
  {
    isOpen: true
  },
  Effects.none
];

// Submitting the form
const Submit = {type: 'Submit'};

export const update = (model, action) =>
  // @TODO
  //action.type === 'Submit' ?
  //Recipes.update()
  Unknown.update(model, action)

export const view = (model, address) =>
  html.dialog({
    className: 'rform-main',
    open: (model.isOpen ? 'open' : null)
  }, [
    html.textarea({
      className: 'rform-textarea'
    }),
    html.footer({
      className: 'rform-footer',
    }, [
      html.button({
        className: 'btn-primary',
        onClick: () => address(Submit)
      }, [
        'Create'
      ])
    ])
  ]);
