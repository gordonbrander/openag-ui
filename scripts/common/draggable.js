import {Effects} from 'reflex';
import {port} from '../common/prelude';
import {update as updateUnknown} from '../common/unknown';

// Actions and tagging functions

const DRAGGING = true;

export const Move = coords => ({
  type: 'Move',
  coords
});

export const Drag = coords => ({
  type: 'Drag',
  coords
});

export const Hold = {
  type: 'Hold'
};

export const Release = {
  type: 'Release'
};

export const NoOp = {
  type: 'NoOp'
};

// Model and update

export class Model {
  constructor(isDragging, coords) {
    this.isDragging = isDragging
    this.coords = coords
  }
}

export const init = (isDragging, coords) => {
  const model = new Model(isDragging, coords);
  return [model, Effects.none];
}

export const update = (model, action) =>
  action.type === 'NoOp' ?
  [model, Effects.none] :
  action.type === 'Hold' ?
  (
    !model.isDragging ?
    [new Model(DRAGGING, model.coords), Effects.none] :
    noOp(model)
  ) :
  action.type === 'Release' ?
  (
    model.isDragging ?
    [new Model(!DRAGGING, model.coords), Effects.none] :
    noOp(model)
  ) :
  action.type === 'Drag' ?
  [new Model(model.isDragging, action.coords), Effects.none] :
  action.type === 'Move' ?
  (
    model.isDragging ?
    drag(model, action.coords) :
    noOp(model)
  ) :
  updateUnknown(model, action);

export const hold = model =>
  update(model, Hold);

export const release = model =>
  update(model, Release);

export const noOp = (model) =>
  update(model, NoOp);

export const drag = (model, coords) =>
  update(model, Drag(coords));

const onHold = port(event => {
  event.preventDefault();
  return Hold;
});

const onRelease = port(event => {
  event.preventDefault();
  return Release;
});

export const onMouseDown = onHold;
export const onTouchStart = onHold;

export const onMouseUp = onRelease;
export const onTouchEnd = onRelease;

export const onTouchMove = port(event => {
  event.preventDefault();
  const changedTouches = event.changedTouches;

  if (changedTouches.length) {
    // @TODO it might be better to find the common midpoint between multiple
    // touches if touches > 1.
    const touch = changedTouches.item(0);
    const coords = calcRelativeMousePos(
      event.currentTarget,
      touch.clientX,
      touch.clientY
    );
    return Drag(coords);
  }
  else {
    return NoOp;
  }
});

export const onMouseMove = port(event => {
  event.preventDefault();
  const coords = calcRelativeMousePos(
    event.currentTarget,
    event.clientX,
    event.clientY
  );
  return Move(coords);
});

// Utils

// Calculate the mouse client position relative to a given element.
const calcRelativeMousePos = (node, clientX, clientY) => {
  const rect = node.getBoundingClientRect();
  return [(clientX - rect.left - node.clientLeft), (clientY - rect.top - node.clientTop)];
}