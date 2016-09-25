import {html, forward, Effects, thunk} from 'reflex';
import {actuators as ACTUATORS} from '../../openag-config.json';
import {update as updateUnknown} from '../common/unknown';
import {merge, batch} from '../common/prelude';
import {cursor} from '../common/cursor';
import {localize} from '../common/lang';
import {compose} from '../lang/functional';
import * as Control from './controls/control';

// Actions

// Configure module (usually just after startup)
export const Configure = (api) => ({
  type: 'Configure',
  api
});

const TagBy = (id, action) => ({
  type: 'ByID',
  id,
  source: action
});

const TagFor = (id) => action => TagBy(id, action);

const Create = (config) => ({
  type: 'Create',
  config
});

// Update, init

export const init = () => {
  const model = {
    api: null,
    order: [],
    items: {}
  };

  return [
    model,
    Effects.none
  ];
}

export const update = (model, action) =>
  action.type === 'ByID' ?
  updateByID(model, action.id, action.source) :
  action.type === 'Create' ?
  create(model, action.config) :
  action.type === 'Configure' ?
  configure(model, action.api, action.environment) :
  updateUnknown(model, action);

const create = (model, config) => {
  const [control, fx] = Control.init(config);
  const id = control.id;

  const next = merge(model, {
    order: [...model.order, id],
    items: merge(model.items, {
      [id]: control
    })
  });

  return [
    next,
    fx.map(TagFor(id))
  ];
}

const configure = (model, api) => {
  const next = merge(model, {
    api
  });

  const actions = ACTUATORS.map(config => {
    const configWithApi = merge(config, {api});
    return Create(configWithApi);
  });

  return batch(update, next, actions);
}

const updateByID = (model, id, action) => {
  const control = model.items[id];
  if (control) {
    const [next, fx] = Control.update(control, action);
    return [
      merge(model, {
        items: merge(model.items, {[id]: next})
      }),
      fx.map(TagFor(id))
    ];
  }
  else {
    console.warn(`No model with id ${id}`);
    return [model, Effects.none];
  }
}

// View

export const view = (model, address) =>
  html.div({
    className: 'full-view'
  }, model.order.map(id => thunk(
    `control_${id}`,
    Control.view,
    model.items[id],
    forward(address, TagFor(id))
  )));