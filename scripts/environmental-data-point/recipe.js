import {Effects} from 'reflex';
import {merge} from '../common/prelude';
import * as Unknown from '../common/unknown';

export const Start = (id, startTime) => ({
  type: 'Start',
  id,
  startTime
});

export const End = (id, endTime) => ({
  type: 'End',
  id,
  endTime
});

// Provide variable name and title for module
export const init = () => [
  {
    id: null,
    startTime: null,
    endTime: null
  },
  Effects.none
];

const isLater = (a, b) =>
  (typeof b !== 'number') ? true :
  (typeof a !== 'number') ? false :
  (a > b);

export const update = (model, action) =>
  action.type === 'Start' && isLater(action.startTime, model.startTime) ?
  [
    merge(model, {
      id: action.id,
      startTime: action.startTime
    }),
    Effects.none
  ] :
  action.type === 'End' && isLater(action.endTime, model.endTime) ?
  [
    merge(model, {
      id: action.id,
      endTime: action.endTime
    }),
    Effects.none
  ] :
  Unknown.update(model, action);
