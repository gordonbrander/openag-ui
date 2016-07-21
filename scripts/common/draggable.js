// Helper functions for showing and hiding model components.
import {Effects} from 'reflex';
import * as Unknown from '../common/unknown';

export const Model = (isDragging, coords) => ({
  isDragging,
  coords
});

export const Hold = {
  type: 'Hold'
};

export const Drag = coords => ({
  type: 'Drag',
  coords
});

export const Release = {
  type: 'Release'
};

export const hold = model =>
  update(model, Hold);

export const release = model =>
  update(model, Release);

export const drag = model =>
  update(model, Close);

export const update = (model, action) =>
  action.type === 'Hold' ?
  [Model(true, model.coords), Effects.none] :
  action.type === 'Release' ?
  [Model(false, model.coords), Effects.none] :
  action.type === 'Drag' ?
  [Model(model.isDragging, action.coords), Effects.none] :
  Unknown.update(model, action);
