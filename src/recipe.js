import {html, forward, Effects, Task, thunk} from 'reflex';
import {merge} from './common/prelude';
import * as Unknown from './common/unknown';

export const init = ({_id, operation}) =>
  ({
    _id,
    operation,
    format: 'linear@0.0.1'
  });

export const view = (model, address) =>
  html.div({
    className: 'recipe'
  }, [
    String(model._id)
  ]);
