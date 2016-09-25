import {actuators as ACTUATORS} from '../../../openag-config.json';
import {html, forward, Effects, thunk} from 'reflex';
import {compose} from '../../lang/functional';
import {batch} from '../../common/prelude';
import {post} from '../../common/request';
import {update as updateUnknown} from '../../common/unknown';
import {render as renderTemplate} from '../../common/stache';
import * as Slider from '../../common/slider';

// Actions

export const Configure = api => ({
  type: 'Configure',
  api
});

export const PostChange = value => ({
  type: 'PostChange',
  value
});

export const PostedChange = result => ({
  type: 'PostedChange',
  result
});

export const Change = value => ({
  type: 'Change',
  value
});

const TagSlider = action =>
  action.type === 'Change' ?
  // Re-box change actions as "Desired Change" actions.
  Change(action.value) :
  SliderAction(action);

const SliderAction = action => ({
  type: 'Slider',
  source: action
});

const ChangeSlider = compose(SliderAction, Slider.Change);

// Model, init, update

export class Model {
  constructor(
    slider,
    id,
    url,
    title
  ) {
    this.slider = slider
    this.id = id
    this.url = url
    this.title = title
  }
}

export const init = (
  id,
  url,
  title,
  value,
  min,
  max,
  step,
  isDisabled = false,
  isFocused = false
) => {
  const [slider, sliderFx] = Slider.init(
    value,
    min,
    max,
    step,
    isDisabled = false,
    isFocused = false
  );

  const model = new Model(
    slider,
    id,
    url,
    title
  );

  return [model, sliderFx.map(TagSlider)];
}

// Initialize as PWM
export const initPwm = (
  id,
  url,
  title,
  value,
  isDisabled,
  isFocused
) => init(
  id,
  url,
  title,
  value,
  0.0,
  1.0,
  0.1,
  isDisabled,
  isFocused
);

export const update = (model, action) =>
  action.type === 'Slider' ?
  delegateSliderUpdate(model, action.source) :
  action.type === 'Change' ?
  change(model, action.value) :
  action.type === 'PostChange' ?
  postChange(model, action.value) :
  action.type === 'PostedChange' ?
  (
    action.result.isOk ?
    postedChangeOk(model, action.result.value) :
    postedChangeError(model, action.result.error)
  ) :
  action.type === 'Configure' ?
  configure(model, action.api) :
  updateUnknown(model, action);

const change = (model, value) =>
  batch(update, model, [
    ChangeSlider(value),
    PostChange(value)
  ]);

const delegateSliderUpdate = (model, action) =>
  swapSlider(model, Slider.update(model.slider, action));

const swapSlider = (model, [slider, fx]) => [
  new Model(slider, model.id, model.url, model.title),
  fx.map(TagSlider)
];

const postChange = (model, value) => [
  model,
  post(model.url, [value]).map(PostedChange)
];

const postedChangeOk = (model, value) =>
  [model, Effects.none];

const postedChangeError = (model, value) => {
  console.warn('Post to slider actuator failed.');
  return [model, Effects.none];
}

// View

export const view = (model, address) =>
  html.div({
    className: 'actuator'
  }, [
    html.span({
      className: 'actuator-title'
    }, [model.title]),
    Slider.view(
      model.slider,
      forward(address, TagSlider),
      'slider actuator-slider'
    )
  ]);