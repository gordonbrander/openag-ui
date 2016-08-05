/*
Render a validated input field.
*/
import {html, forward, Effects} from 'reflex';
import {tagged, merge} from '../common/prelude';
import {cursor} from '../common/cursor';
import {toggle, classed} from '../common/attr';
import * as Input from '../common/input';
import * as Unknown from '../common/unknown';

// Actions

const TagInput = action =>
  action.type === 'Blur' ?
  Blur :
  tagged('Input', action);

const Blur = {type: 'Blur'};

const Checking = {type: 'Checking'};

export const Check = value => ({
  type: 'Check',
  value
});

export const Ok = message => ({
  type: 'Ok',
  message
});

export const Error = message => ({
  type: 'Error',
  message
});

// Model

const INITIAL = 'initial';
const OK = 'ok';
const ERROR = 'error';
const CHECKING = 'checking';

export const init = (
  value/*:string*/='',
  selection/*:?Editable.Selection*/=null,
  placeholder/*:string*/='',
  isDisabled/*:boolean*/=false
) => {
  const [input, inputFx] = Input.init(value, selection, placeholder, isDisabled);

  return [
    {
      mode: INITIAL,
      message: '',
      input
    },
    inputFx.map(TagInput)
  ];
};

export const update = (model, action) =>
  action.type === 'Input' ?
  updateInput(model, action.source) :
  action.type === 'Blur' ?
  updateBlur(model) :
  action.type === 'Ok' ?
  [
    merge(model, {
      mode: OK,
      message: action.message
    }),
    Effects.none
  ] :
  action.type === 'Error' ?
  [
    merge(model, {
      mode: ERROR,
      message: action.message
    }),
    Effects.none
  ] :
  action.type === 'Checking' ?
  [
    merge(model, {
      mode: CHECKING
    }),
    Effects.receive(Check(model.input.value))
  ] :
  Unknown.update(model, action);

const updateInput = cursor({
  get: model => model.input,
  set: (model, input) => merge(model, {input}),
  update: Input.update,
  tag: TagInput
});

const updateBlur = model => {
  const [next, fx] = updateInput(model, Input.Blur);

  return [
    next,
    Effects.batch([
      fx,
      // Request a check. This will put the validator into "checking" mode.
      Effects.receive(Checking)
    ])
  ];
}

// View

export const view = (model, address, className) =>
  html.div({
    className: classed({
      [className]: true,
      'validator': true,
      'validator-ok': model.mode === OK,
      'validator-error': model.mode === ERROR,
      'validator-initial': model.mode === INITIAL,
      'validator-checking': model.mode === CHECKING
    })
  }, [
    Input.view(model.input, forward(address, TagInput), 'input validator-input'),
    html.div({
      className: 'validator-message',
      hidden: toggle('hidden', model.message === '')
    }, [
      model.message
    ])
  ]);