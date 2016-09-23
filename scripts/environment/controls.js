import {html, forward, Effects, thunk} from 'reflex';
import {actuators as ACTUATORS} from '../../openag-config.json';
import {update as updateUnknown} from '../common/unknown';
import {merge, batch} from '../common/prelude';
import {cursor} from '../common/cursor';
import {localize} from '../common/lang';
import {compose} from '../lang/functional';
import * as Toggle from './controls/actuator-toggle';

// Actions

// Configure module (usually just after startup)
export const Configure = (api, environment) => ({
  type: 'Configure',
  api,
  environment
});

const Tag = type => action => ({
  type,
  source: action
});

const TagRedPin = Tag('RedPin');
const ConfigureRedPin = compose(TagRedPin, Toggle.Configure);

// Update, init

export const init = () => {
  const [redPin, redPinFx] = Toggle.init('red_pin');

  const model = {
    api: null,
    environment: null,
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
  action.type === 'Configure' ?
  configure(model, action.api, action.environment) :
  action.type === 'RedPin' ?
  updateRedPin(model, action.source) :
  updateUnknown(model, action);

const configure = (model, api, environment) => {
  const next = merge(model, {
    api,
    environment
  });

  return batch(update, model, [
    ConfigureRedPin(api, environment)
  ]);
}

const updateRedPin = cursor({
  get: model => model.redPin,
  set: (model, redPin) => merge({redPin}),
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