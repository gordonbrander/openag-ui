import {html, forward, Effects, thunk} from 'reflex';
import {merge, port} from '../common/prelude';
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

export const view = (model, address) => {
  const sendPointDashboard = onPointDashboard(address);
  const sendPointChart = onPointChart(address);

  return html.div({
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
        onMouseDown: sendPointDashboard,
        onTouchStart: sendPointDashboard,
        className: classed({
          'ir': true,
          'nav-dash-icon': true,
          'nav-dash-icon-active': model.active === DASHBOARD
        }),
        title: localize('Dashboard')
      }, [
        localize('Dashboard')
      ]),
      html.a({
        onMouseDown: sendPointChart,
        onTouchStart: sendPointChart,
        className: classed({
          'ir': true,
          'nav-chart-icon': true,
          'nav-chart-icon-active': model.active === CHART
        }),
        title: localize('Chart')
      }, [
        localize('Chart')
      ])
    ])
  ]);
}

const onPointDashboard = port(event => {
  // Prevent event from bubbling. This prevents touch events from
  // transmogrifying into click events in iOS.
  event.preventDefault();
  return ActivateDashboard;
});

const onPointChart = port(event => {
  // Prevent event from bubbling. This prevents touch events from
  // transmogrifying into click events in iOS.
  event.preventDefault();
  return ActivateChart;
});
