// @note this file is probably temporary, since authoring recipe JSON by
// hand is a pain.

import {html, forward, Effects, thunk} from 'reflex';
import * as Banner from '../common/banner';
import * as Unknown from '../common/unknown';
import {localize} from '../common/lang';
import {merge, tag, batch, port} from '../common/prelude';
import {cursor} from '../common/cursor';
import {classed} from '../common/attr';
import * as Input from '../common/input';
import {compose} from '../lang/functional';
import * as Recipes from '../recipes';

// Action tagging functions

const TextareaAction = tag('Textarea');

// Actions

export const Back = {
  type: 'Back'
};

// Submitting the form
export const Submit = recipe => ({
  type: 'Submit',
  recipe
});

export const Submitted = recipe => ({
  type: 'Submitted',
  recipe
});

export const Cancel = {
  type: 'Cancel'
};

export const Clear = TextareaAction(Input.Clear);

const TagBanner = source => ({
  type: 'Banner',
  source
});

export const Alert = compose(TagBanner, Banner.AlertDismissable);
export const Notify = compose(TagBanner, Banner.Notify);

const FailRecipeParse = TagBanner(Banner.AlertDismissable("Uh-oh! Invalid JSON."));

// Init and update functions

export const init = () => {
  const placeholder = localize('Paste recipe JSON...');
  const [textarea, textareaFx] = Input.init('', null, placeholder);
  const [banner, bannerFx] = Banner.init();
  return [
    {
      isOpen: false,
      textarea,
      banner
    },
    textareaFx.map(TextareaAction),
    bannerFx.map(TagBanner)
  ];
};

// Update functions

export const update = (model, action) =>
  action.type === 'Banner' ?
  updateBanner(model, action.source) :
  action.type === 'Textarea' ?
  updateTextarea(model, action.source) :
  action.type === 'Submit' ?
  submit(model, action.recipe) :
  Unknown.update(model, action);

const submit = (model, recipeJSON) => {
  try {
    const recipe = JSON.parse(recipeJSON);
    return [
      model,
      Effects.batch([
        // Send Submitted action up to parent
        Effects.receive(Submitted(recipe)),
        Effects.receive(Clear)
      ])
    ];
  } catch (e) {
    // @TODO throw up a banner for this case.
    return [model, Effects.receive(FailRecipeParse)];
  }
}

const updateTextarea = cursor({
  get: model => model.textarea,
  set: (model, textarea) => merge(model, {textarea}),
  tag: TextareaAction,
  update: Input.update
});

const updateBanner = cursor({
  get: model => model.banner,
  set: (model, banner) => merge(model, {banner}),
  tag: TagBanner,
  update: Banner.update
});

// View

export const view = (model, address, isActive) => {
  const sendBack = onBack(address);
  const sendSubmit = onSubmit(address);
  return html.div({
    className: classed({
      'panel--main': true,
      'panel--lv1': true,
      'panel--main-close': !isActive
    })
  }, [
    html.header({
      className: 'panel--header'
    }, [
      html.h1({
        className: 'panel--title'
      }, [
        localize('Import Recipe')
      ]),
      html.div({
        className: 'panel--nav-left'
      }, [
        html.a({
          className: 'recipes-back-icon',
          onTouchStart: sendBack,
          onMouseDown: sendBack
        })
      ]),
      html.div({
        className: 'panel--nav-right'
      }, [
        html.button({
          className: 'btn-panel',
          type: 'submit',
          onTouchStart: sendSubmit,
          onMouseDown: sendSubmit
        }, [
          localize('Save')
        ])
      ])
    ]),
    thunk(
      'recipe-form-banner',
      Banner.view,
      model.banner,
      forward(address, TagBanner),
      'rform-banner'
    ),
    html.div({
      className: 'panel--content'
    }, [
      html.div({
        className: 'rform-main'
      }, [
        html.form({
          className: 'rform-form'
        }, [
          thunk(
            'textarea',
            Input.viewTextarea,
            model.textarea,
            forward(address, TextareaAction),
            'rform-textarea',
            'rform-textarea txt-textarea'
          )
        ])
      ])
    ])
  ]);
}

const onSubmit = port(event => {
  // @TODO create a proper input module instead of kludging this in a
  // brittle way. We want to be able to send an Effect that will
  // focus, unfocus. We also want to read value changes from `onInput`.
  // See https://github.com/browserhtml/browserhtml/blob/master/src/common/ref.js
  // https://gist.github.com/Gozala/2b6a301846b151aafe807104304dbd06#file-focus-js
  event.preventDefault();
  const el = document.querySelector('#rform-textarea');
  return Submit(el.value);
});

const onBack = port(event => {
  event.preventDefault();
  return Back;
})