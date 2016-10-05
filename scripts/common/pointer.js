/* Module for describing pointerevent-like things that respond to:

- Click
- Single touch
*/
import {Effects} from "reflex";
import {always, port} from "../common/prelude";
import {updateUnknown} from "../common/unknown";

// Actions

export const PointStart = {type: 'PointStart'};
export const PointEnd = {type: 'PointEnd'};

// Model

export class Model {
  constructor(isDown) {
    this.isDown = isDown
  }
}

export const init = (isDown = false) => {
  const model = new Model(isDown);
  return [model, Effects.none];
}

export const update = (model, action) =>
  action.type === 'PointStart' ?
  pointStart(model) :
  action.type === 'PointEnd' ?
  pointEnd(model) :
  updateUnknown(model, action);

export const pointStart = model => [
  new Model(true),
  Effects.none
];

export const pointEnd = model => [
  new Model(false),
  Effects.none
];

// Events

const onPointStart = port(event => {
  // Prevent event from bubbling. This prevents touch events from
  // transmogrifying into click events in iOS.
  event.preventDefault();
  return PointStart;
});

// Use this port for onMouseDown and onTouchStart.
export const onMouseDown = onPointStart;
export const onTouchStart = onPointStart;

const onPointEnd = port(event => {
  event.preventDefault();
  return PointEnd;
});

export const onMouseUp = onPointEnd;
export const onTouchEnd = onPointEnd;