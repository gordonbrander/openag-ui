import {html, Effects, forward, thunk} from 'reflex';
import * as Option from '../common/option';
import {merge} from '../common/prelude';
import {update as updateUnknown} from '../common/unknown';

// Actions

export const AppendOption = (id, text, value, isDisabled) => ({
  type: 'AppendOption',
  option: Option.assemble(id, text, value, isDisabled)
});

export const Options = options => ({
  type: 'Options',
  options
});

// @TODO this should also capture active selection.
export const Change = value => ({
  type: 'Change',
  value
});

const For = (id, action) => ({
  type: 'For',
  id,
  source: action
});

const TagForID = (id, action) => For(id, action);

const ForID = id => action => TagForID(id, action);

// Model, init, update

export const init = (options) => {
  const hasOptions = options && options.length > 0;

  const model = (
    hasOptions ?
    {
      value: Option.readValue(options[0]),
      options
    } :
    {
      value: null,
      options: []
    }
  );

  return [
    model,
    Effects.none
  ];
}

export const update = (model, action) =>
  action.type === 'For' ?
  updateForID(action.id, action.source) :
  action.type === 'Change' ?
  [merge(model, {value: action.value}), Effects.none] :
  action.type === 'AppendOption' ?
  appendOption(model, action.option) :
  action.type === 'Options' ?
  setOptions(model, action.options) :
  updateUnknown(model, action);

const updateForID = (id, action) =>
  updateUnknown(model, action);

const appendOption = (model, option) => {
  // If there are no options, then set the value of the new option as the value
  // of the form element.
  if (model.options.length === 0) {
    return [
      merge(model, {
        value: Option.readValue(option),
        options: [option]
      }),
      Effects.none
    ];
  }
  else {
    return [
      merge(model, {
        options: model.options.concat(option)
      }),
      Effects.none
    ];
  }
}

const setOptions = (model, options) => [
  merge(model, {
    value: Option.readValue(options[0]),
    options: options
  }),
  Effects.none
];

// View

export const view = (model, address, className) =>
  html.select(
    {
      className,
      onChange: onChange(address)
    },
    model.options.map(Option.view)
  );

export const onChange = address => forward(address, decodeChangeEvent);

export const decodeChangeEvent = (event) => Change(event.target.value);

// Helpers

export const readValue = model => model.value