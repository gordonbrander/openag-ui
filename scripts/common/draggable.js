// Helper functions for showing and hiding model components.
import {Effects} from 'reflex';
import * as Unknown from '../common/unknown';

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

export const Model = (isDragging, coords) => ({
  isDragging,
  coords
});

export const update = (model, action) =>
  action.type === 'NoOp' ?
  [model, Effects.none] :
  action.type === 'Hold' ?
  (
    !model.isDragging ?
    [Model(DRAGGING, model.coords), Effects.none] :
    noOp(model)
  ) :
  action.type === 'Release' ?
  (
    model.isDragging ?
    [Model(!DRAGGING, model.coords), Effects.none] :
    noOp(model)
  ) :
  action.type === 'Drag' ?
  [Model(model.isDragging, action.coords), Effects.none] :
  action.type === 'Move' ?
  (
    model.isDragging ?
    drag(model, action.coords) :
    noOp(model)
  ) :
  Unknown.update(model, action);

export const hold = model =>
  update(model, Hold);

export const release = model =>
  update(model, Release);

export const noOp = (model) =>
  update(model, NoOp);

export const drag = (model, coords) =>
  update(model, Drag(coords));