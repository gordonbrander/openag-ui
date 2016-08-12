import {html, forward, Effects, Task, thunk} from 'reflex';
import {merge, tagged, tag, batch} from '../common/prelude';
import * as Unknown from '../common/unknown';

export const init = () => [
  {
    airTemperature: null
  },
  Effects.none
];

export const update = (model, action) =>
  Unknown.update(model, action);

// View

export const view = (model, address) =>
  html.aside({
    className: 'sidebar-summary'
  }, [
  ]);