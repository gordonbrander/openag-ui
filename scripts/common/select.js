import {html, Effects, forward, thunk} from 'reflex';
import {annotate} from '../common/prelude'
import {update as updateUnknown} from '../common/unknown';

// Actions

export const AppendOption = (id, text, value) => ({
  type: 'AppendOption',
  option: Option(id, text, value)
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

const TagForID = (id, action) =>
  For(id, action);

const ForID = id => action => TagForID(id, action);

// Model, init, update

export const Option = (id, text, value) => ({
  id, text, value
});

export const init = (options, active) => {
  return [
    {
      active,
      options: (options || [])
    },
    Effects.none
  ];
}

export const update = (model, action) =>
  action.type === 'For' ?
  updateForID(action.id, action.source) :
  action.type === 'AppendOption' ?
  [
    merge(model, {
      options: [...model.options, action.option]
    }),
    Effects.none
  ] :
  action.type === 'Options' ?
  [
    merge(model, {options: action.options}),
    Effects.none
  ] :
  updateUnknown(model, action);

const updateForID = (id, action) =>
  updateUnknown(model, action);

// View

export const view = (model, address, className) =>
  html.select(
    {
      className,
      onChange: onChange(address)
    },
    model.options.map(renderOption)
  );

const renderOption = (model) =>
  html.option({
    value: model.value
  }, [
    model.text
  ]);

export const onChange = address => forward(address, decodeChangeEvent);

export const decodeChangeEvent = (event) => Change(event.target.value);