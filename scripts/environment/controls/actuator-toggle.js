import {actuators as ACTUATORS} from '../../../openag-config.json';
import {html, forward, Effects, thunk} from 'reflex';
import * as Toggle from '../../common/toggle';
import {post} from '../../common/request';
import {merge, batch} from '../../common/prelude';
import {cursor} from '../../common/cursor';
import {update as updateUnknown} from '../../common/unknown';
import {render as renderTemplate} from '../../common/stache';
import {compose} from '../../lang/functional';

// Actions

export const Change = (isActivated) => ({
  type: 'Change',
  isActivated
});

// Configure module (usually just after startup)
export const Configure = (api, environment) => ({
  type: 'Configure',
  api,
  environment
});

export const PostChange = isActivated => ({
  type: 'PostChange',
  isActivated
});

export const PostedChange = result => ({
  type: 'PostedChange',
  result
});

const TagToggle = action =>
  action.type === 'Change' ?
  Change(action.isActivated) :
  ToggleAction(action);

const ToggleAction = action => ({
  type: 'Toggle',
  source: action
});

const ChangeToggle = compose(ToggleAction, Toggle.Change);

// Update, init

export const init = (topic) => {
  const [toggle, toggleFx] = Toggle.init(topic, false);

  const model = {
    url: null,
    topic,
    toggle
  };

  return [
    model,
    toggleFx.map(TagToggle)
  ];
};

export const update = (model, action) =>
  action.type === 'Toggle' ?
  updateToggle(model, action.source) :
  action.type === 'Change' ?
  change(model, action.isActivated) :
  action.type === 'PostChange' ?
  postChange(model, action.isActivated) :
  action.type === 'PostedChange' ?
  (
    action.result.isOk ?
    postedChangeOk(model, action.result.value) :
    postedChangeError(model, action.result.error)
  ) :
  action.type === 'Configure' ?
  configure(model, action.api, action.environment) :
  updateUnknown(model, action);

const change = (model, isActivated) =>
  batch(update, model, [
    PostChange(isActivated),
    ChangeToggle(isActivated)
  ]);

const postChange = (model, isActivated) => {
  if (typeof model.url === 'string') {
    return [
      model,
      post(model.url, [isActivated]).map(PostedChange)
    ];
  }
  else {
    console.warn('PostChange was sent before model url was configured. This should never happen.');
    return [model, Effects.none];
  }
}

const postedChangeOk = (model, value) =>
  [model, Effects.none];

const postedChangeError = (model, value) => {
  console.warn('Post to toggle actuator failed.');
  return [model, Effects.none];
}

const configure = (model, api, environment) => {
  const url = templateTopicUrl(api, environment, model.topic);
  return [
    merge(model, {url}),
    Effects.none
  ];
}

const updateToggle = cursor({
  get: model => model.toggle,
  set: (model, toggle) => merge(model, {toggle}),
  update: Toggle.update,
  tag: TagToggle
});

// View

export const view = (model, address) =>
  html.div({

  }, [
    Toggle.view(model, forward(address, TagToggle))
  ]);

// Utils

const templateTopicUrl = (api, environment, topic) =>
  renderTemplate(ACTUATORS.url, {
    api,
    environment,
    topic
  });