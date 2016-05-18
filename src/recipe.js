import {html, forward, Effects, Task, thunk} from 'reflex';
import {merge} from './common/prelude';
import * as Unknown from './common/unknown';

export const StartVariable = 'EnvironmentalVariable.RECIPE_START';
export const EndVariable = 'EnvironmentalVariable.RECIPE_END';

export const Activate = {
  type: 'Activate'
};

export const init = ({_id, operation}) =>
  ({
    _id,
    operation,
    format: 'linear@0.0.1'
  });

export const update = (model, action) =>
  Unknown.update(model, action);

export const view = (model, address) =>
  html.div({
    className: 'recipe',
    onClick: () => address(Activate)
  }, [
    String(model._id)
  ]);
