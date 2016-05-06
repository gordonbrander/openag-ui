// @note this file is probably temporary, since authoring recipe JSON by
// hand is a pain.

import {html, forward, Effects, thunk} from 'reflex';
import * as Unknown from '../common/unknown';
import {merge, tag, batch} from '../common/prelude';
import {cursor} from '../common/cursor';
import * as ClassName from '../common/classname';
import * as Textarea from '../common/textarea';
import * as Recipes from '../recipes';

// Action tagging functions

const TextareaAction = tag('Textarea');

// Actions

// Submitting the form
export const Submit = recipe => ({
  type: 'Submit',
  recipe
});

export const Submitted = recipe => ({
  type: 'Submitted',
  recipe
});

// Sent in the case that parsing the JSON for the recipe fails.
export const FailRecipeParse = {
  type: 'FailRecipeParse'
};

export const Cancel = {
  type: 'Cancel'
};

export const Clear = TextareaAction(Textarea.Clear);

// Init and update functions

export const init = () => {
  const [textarea, textareaFx] = Textarea.init();
  return [
    {
      isOpen: false,
      textarea
    },
    textareaFx.map(TextareaAction)
  ];
};

// Update functions

export const submit = (model, recipeJSON) => {
  try {
    const recipe = JSON.parse(recipeJSON);
    return [
      model,
      Effects.batch([
        Effects.receive(Submitted(recipe)),
        Effects.receive(Clear)
      ])
    ];
  } catch (e) {
    return [model, Effects.receive(FailRecipeParse)];
  }
}

const cancel = model =>
  batch(update, model, [
    Clear,
    Close
  ]);

const updateTextarea = cursor({
  get: model => model.textarea,
  set: (model, textarea) => merge(model, {textarea}),
  tag: TextareaAction,
  update: Textarea.update
});

export const update = (model, action) =>
  action.type === 'Textarea' ?
  updateTextarea(model, action.source) :
  action.type === 'Submit' ?
  submit(model, action.recipe) :
  action.type === 'Cancel' ?
  cancel(model) :
  Unknown.update(model, action);

const viewTextArea = Textarea.view('rform-textarea', 'txt-textarea');

const nil = void(0);

export const view = (model, address) =>
  html.div({
    className: 'rform-main'
  }, [
    html.form({
      className: 'rform-form'
    }, [
      thunk(
        'textarea',
        viewTextArea,
        model.textarea,
        forward(address, TextareaAction)
      ),
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
