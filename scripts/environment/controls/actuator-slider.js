import {html, forward, Effects, thunk} from 'reflex';
import {compose} from '../../lang/functional';
import {update as updateUnknown} from '../../common/unknown';
import * as Slider from '../../common/slider';
import {round2x} from '../../lang/number';

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
    measured,
    unit
  ) {
    this.slider = slider
    this.label = label
    this.measured = measured
    this.unit = unit;
  }
}

export const init = (
  label,
  min,
  max,
  measured,
  desired,
  unit,
  isDisabled = false,
  isFocused = false
) => {
  const [slider, sliderFx] = Slider.init(
    min,
    max,
    desired,
    isDisabled = false,
    isFocused = false
  );

  const model = new Model(
    slider,
    label,
    measured,
    unit
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
    measured
  ),
  Effects.none
];

const delegateSliderUpdate = (model, action) =>
  swapSlider(model, Slider.update(model.slider, action));

const swapSlider = (model, [slider, fx]) => [
  new Model(slider, model.label, model.measured, model.unit),
  fx.map(TagSlider)
];

// View

export const view = (model, address, className) =>
  html.div({
    className: ('actuator ' + className)
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
  value ? round2x(value) + ' ' + unit : '-';