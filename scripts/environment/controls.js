import {html, forward, Effects, thunk} from 'reflex';
import {actuators as ACTUATORS} from '../../openag-config.json';
import {update as updateUnknown} from '../common/unknown';
import {merge} from '../common/prelude';
import {cursor} from '../common/cursor';
import {localize} from '../common/lang';
import * as Toggle from '../common/toggle';

// Actions

// Configure module (usually just after startup)
export const Configure = api => ({
  type: 'Configure',
  api
});

const TagRedPin = action => ({
  type: 'RedPin',
  source: action
});

// Update, init

export const init = () => {
  const [redPin, redPinFx] = Toggle.init('red_pin', false);

  const model = {
    api: null,
    redPin
  };

  return [
    model,
    Effects.batch([
      redPinFx.map(TagRedPin)
    ])
  ];
}

export const update = (model, action) =>
  action.type === 'RedPin' ?
  updateRedPin(model, action.source) :
  action.type === 'Configure' ?
  configure(model, action.api) :
  updateUnknown(model, action);

const configure = (model, api) => [
  merge(model, {api}),
  Effects.none
];

const updateRedPin = cursor({
  get: model => model.redPin,
  set: (model, redPin) => merge(model, {redPin}),
  update: Toggle.update,
  tag: TagRedPin
});

// View

export const view = (model, address) =>
  html.div({
    className: 'full-view'
  }, [
    thunk(
      'controls-red-pin-toggle',
      Toggle.view,
      model.redPin,
      forward(address, TagRedPin)
    )
  ]);