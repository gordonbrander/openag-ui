import {html, forward, Effects, thunk} from 'reflex';
import {compose} from '../../lang/functional';
import {update as updateUnknown} from '../../common/unknown';
import * as Slider from '../../common/slider';
import {round2x, isNumber} from '../../lang/number';

// Actions

export const ChangeMeasured = measured => ({
  type: 'ChangeMeasured',
  measured
});

const TagSlider = action => ({
  type: 'Slider',
  source: action
});

export const ChangeDesired = compose(TagSlider, Slider.Change);

// Model, init, update

export class Model {
  constructor(
    slider,
    label,
    unit,
    measured
  ) {
    this.slider = slider
    this.label = label
    this.unit = unit
    this.measured = measured
  }
}

export const init = (
  label,
  unit,
  measured,
  desired,
  min,
  max,
  step,
  isDisabled = false,
  isFocused = false
) => {
  const [slider, sliderFx] = Slider.init(
    desired,
    min,
    max,
    step,
    isDisabled = false,
    isFocused = false
  );

  const model = new Model(
    slider,
    label,
    unit,
    measured
  );

  return [model, sliderFx.map(TagSlider)];
}

export const update = (model, action) =>
  action.type === 'Slider' ?
  delegateSliderUpdate(model, action.source) :
  action.type === 'ChangeMeasured' ?
  changeMeasured(model, action.measured) :
  updateUnknown(model, action);

const changeMeasured = (model, measured) => [
  new Model(
    model.slider,
    model.label,
    model.unit,
    measured
  ),
  Effects.none
];

const delegateSliderUpdate = (model, action) =>
  swapSlider(model, Slider.update(model.slider, action));

const swapSlider = (model, [slider, fx]) => [
  new Model(slider, model.label, model.unit, model.measured),
  fx.map(TagSlider)
];

// View

export const view = (model, address) =>
  html.div({
    className: 'actuator'
  }, [
    html.label({
      className: 'actuator-label'
    }, [model.label]),
    thunk(
      'actuator-slider',
      Slider.view,
      model.slider,
      forward(address, TagSlider),
      'range actuator-range'
    ),
    html.div({
      className: 'actuator-readings'
    }, [
      html.span({
        className: 'actuator-value'
      }, [
        templateUnit(model.measured, model.unit),
      ]),
      ' / ',
      html.span({
        className: 'actuator-value'
      }, [
        templateUnit(model.slider.value, model.unit)
      ])
    ])
  ])

// Utils

const templateUnit = (value, unit) =>
  isNumber(value) ? round2x(value) + ' ' + unit : '-';