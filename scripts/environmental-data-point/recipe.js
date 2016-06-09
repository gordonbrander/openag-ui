import {Effects} from 'reflex';
import {merge} from '../common/prelude';
import * as Unknown from '../common/unknown';

export const Start = ({id, environment, startTime}) => ({
  type: 'Start',
  id,
  environment,
  startTime
});

export const End = ({id, environment, endTime}) => ({
  type: 'End',
  id,
  environment,
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
  action.type === 'Start'?
  (
    isLater(action.startTime, model.startTime) ?
    [
      merge(model, {
        id: action.id,
        startTime: action.startTime
      }),
      Effects.none
    ] :
    // If we've already seen this recipe start, do nothing.
    [
      model,
      Effects.none
    ]
  ) :
  action.type === 'End' ?
  (
    isLater(action.endTime, model.endTime) ?
    [
      merge(model, {
        id: action.id,
        endTime: action.endTime
      }),
      Effects.none
    ] :
    [
      model,
      Effects.none
    ]
  ) :
  Unknown.update(model, action);
