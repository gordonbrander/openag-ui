import {html, forward, Effects, thunk} from 'reflex';
import {actuators as ACTUATORS} from '../../openag-config.json';
import {update as updateUnknown} from '../common/unknown';
import {merge} from '../common/prelude';
import {cursor} from '../common/cursor';
import {localize} from '../common/lang';
import * as Slider from '../common/slider';

const LIGHT_PANEL = ACTUATORS.light_panel;

// Actions

export const Configure = origin => ({
  type: 'Configure',
  origin
});

export const TagLightPanel = action => ({
  type: 'LightPanel',
  source: action
});

// Update, init

export const init = () => {
  const [lightPanel, lightPanelFx] = Slider.init(
    LIGHT_PANEL.min,
    LIGHT_PANEL.max,
    null
  );

  const model = {
    origin: null,
    lightPanel
  };

  return [
    model,
    Effects.batch([
      lightPanelFx.map(TagLightPanel)
    ])
  ];
}

export const update = (model, action) =>
  action.type === 'Configure' ?
  configure(model, action.origin) :
  action.type === 'LightPanel' ?
  updateLightPanel(model, action.source) :
  updateUnknown(model, action);

const configure = (model, origin) => [
  merge(model, {origin}),
  Effects.none
];

const updateLightPanel = cursor({
  get: model => model.lightPanel,
  set: (model, lightPanel) => merge(model, {lightPanel}),
  update: Slider.update,
  tag: TagLightPanel
});

// View

export const view = (model, address) =>
  html.div({
    className: 'full-view'
  }, [
    thunk(
      'light-panel-control',
      Slider.view,
      model.lightPanel,
      forward(address, TagLightPanel),
      'range light-panel-range'
    )
  ]);