import {html, forward, Effects, thunk} from 'reflex';
import {merge, tagged, tag} from '../common/prelude';
import * as Unknown from '../common/unknown';
import {classed} from '../common/attr';
import {localize} from '../common/lang';

// Actions

export const DASHBOARD = 'dashboard';
export const CHART = 'chart';

export const ActivateState = id => ({
  type: 'ActivateState',
  id
});

const ActivateDashboard = ActivateState(DASHBOARD);
const ActivateChart = ActivateState(CHART);

// Configure settings (usually comes from parent who read it from local DB).
export const Configure = name => ({
  type: 'Configure',
  name
});

// Init and update

export const init = (active) => [
  {
    active,
    name: null
  },
  Effects.none
];

export const update = (model, action) =>
  action.type === 'ActivateState' ?
  [
    merge(model, {active: action.id}),
    Effects.none
  ] :
  action.type === 'Configure' ?
  [
    merge(model, {name: action.name}),
    Effects.none
  ] :
  Unknown.update(model, action);

// View

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
        onClick: () => address(ActivateDashboard),
        className: classed({
          'ir': true,
          'nav-dash-icon': true,
          'nav-dash-icon-active': model.active === DASHBOARD
        })
      }, [
        localize('Dashboard')
      ]),
      html.a({
        onClick: () => address(ActivateChart),
        className: classed({
          'ir': true,
          'nav-chart-icon': true,
          'nav-chart-icon-active': model.active === CHART
        })
      }, [
        localize('Chart')
      ])
    ])
  ]);

// Utilities

export const active = model => model.active;