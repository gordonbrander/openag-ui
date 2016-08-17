import {html, forward, Effects, thunk} from 'reflex';
import {merge, tagged, tag} from '../common/prelude';
import * as Unknown from '../common/unknown';
import {classed} from '../common/attr';
import {localize} from '../common/lang';

// Configure settings (usually comes from parent who read it from local DB).
export const Configure = value => ({
  type: 'Configure',
  value
});

export const init = () => [
  {
    name: null
  },
  Effects.none
];

export const update = (model, action) =>
  action.type === 'Configure' ?
  [
    merge(model, {
      name: readNameFromRecord(action.value)
    }),
    Effects.none
  ] :
  Unknown.update(model, action);

const readNameFromRecord = record => record.name;

const readName = model =>
  typeof model.name === 'string' ?
  model.name : '-';

export const view = (model, address) =>
  html.div({
    className: 'nav-main'
  }, [
    html.nav({
      className: 'nav-toolbar'
    }, [
      html.a({
        className: 'nav-name'
      }, [
        readName(model)
      ]),
      html.a({
        className: classed({
          'ir': true,
          'nav-chart-icon': true,
          'nav-chart-icon-active': true
        })
      }, [
        localize('Chart')
      ])
    ])
  ]);
