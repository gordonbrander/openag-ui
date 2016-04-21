// @note this file is probably temporary, since authoring recipe JSON by
// hand is a pain.

import {html, forward, Effects} from 'reflex';
import * as Unknown from '../common/unknown';
import * as Recipes from '../recipes';

// Will not create a property field.
const nil = void(0);

export const init = () => [
  {
    isOpen: false
  },
  Effects.none
];

// Submitting the form
const Create = operations => ({
  type: 'Create',
  operations
});

export const update = (model, action) =>
  // @TODO
  //action.type === 'Submit' ?
  //Recipes.update()
  Unknown.update(model, action)

export const view = (model, address) =>
  html.dialog({
    className: 'rform-main',
    open: (model.isOpen ? 'open' : nil)
  }, [
    html.form({
      className: 'rform-form',
      onSubmit: (event) => {
        // @TODO create a proper input module instead of kludging this in a
        // brittle way. We want to be able to send an Effect that will
        // focus, unfocus. We also want to read value changes from `onInput`.
        // See https://github.com/browserhtml/browserhtml/blob/master/src/common/ref.js
        // https://gist.github.com/Gozala/2b6a301846b151aafe807104304dbd06#file-focus-js
        event.preventDefault();
        const el = document.querySelector('#rform-textarea');
        address(Create(el.value));
      }
    }, [
      html.textarea({
        className: 'rform-textarea',
        id: 'rform-textarea',
      }),
      html.footer({
        className: 'rform-footer',
      }, [
        html.button({
          className: 'btn-primary',
          type: 'submit',
        }, [
          'Create'
        ])
      ])
    ])
  ]);
