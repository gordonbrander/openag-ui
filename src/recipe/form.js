// @note this file is probably temporary, since authoring recipe JSON by
// hand is a pain.

import {html, forward, Effects} from 'reflex';
import * as Unknown from '../common/unknown';
import {merge} from '../common/prelude';
import * as ClassName from '../common/classname';
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
export const Submit = recipe => ({
  type: 'Submit',
  recipe
});

export const RequestCreate = recipe => ({
  type: 'RequestCreate',
  recipe
});

// Sent in the case that parsing the JSON for the recipe fails.
export const FailRecipeParse = {
  type: 'FailRecipeParse'
};

export const Open = {
  type: 'Open'
};

export const Close = {
  type: 'Close'
};

export const Cancel = {
  type: 'Cancel'
};

// Update functions

export const submit = (model, recipeJSON) => {
  try {
    const recipe = JSON.parse(recipeJSON);
    return [model, Effects.receive(RequestCreate(recipe))];
  } catch (e) {
    return [model, Effects.receive(FailRecipeParse)];
  }
}


export const update = (model, action) =>
  action.type === 'Submit' ?
  submit(model, action.recipe) :
  action.type === 'Open' ?
  [merge(model, {isOpen: true}), Effects.none] :
  action.type === 'Close' ?
  [merge(model, {isOpen: false}), Effects.none] :
  Unknown.update(model, action);

export const view = (model, address) =>
  html.dialog({
    className: ClassName.create({
      'rform-main': true,
      'rform-main-close': !model.isOpen
    }),
    open: (model.isOpen ? 'open' : nil)
  }, [
    html.form({
      className: 'rform-form'
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
          onClick: (event) => {
            // @TODO create a proper input module instead of kludging this in a
            // brittle way. We want to be able to send an Effect that will
            // focus, unfocus. We also want to read value changes from `onInput`.
            // See https://github.com/browserhtml/browserhtml/blob/master/src/common/ref.js
            // https://gist.github.com/Gozala/2b6a301846b151aafe807104304dbd06#file-focus-js
            event.preventDefault();
            const el = document.querySelector('#rform-textarea');
            address(Submit(el.value));
          }
        }, [
          'Create'
        ]),
        html.button({
          className: 'btn-secondary',
          type: 'cancel',
          onClick: (event) => {
            event.preventDefault();
            address(Cancel);
          }
        }, [
          'Cancel'
        ])
      ])
    ])
  ]);
