import {html, forward, Effects, Task, thunk} from 'reflex';
import * as Config from '../../openag-config.json';
import * as Template from '../common/stache';
import {merge, tag, tagged} from '../common/prelude';
import {classed, toggle} from '../common/attr';
import * as Modal from '../common/modal';
import {localize} from '../common/lang';
import * as Unknown from '../common/unknown';

const MAX_DATAPOINTS = 5000;

// Actions

export const Open = Modal.Open;
export const Close = Modal.Close;

// Model init and update

export const init = () => [
  {
    isOpen: false
  },
  Effects.none
];

export const update = Modal.update;

// View

export const view = (model, address, environmentID) => {
  const variables = Config.chart.map(readVariable);

  return html.div({
    className: 'modal'
  }, [
    html.div({
      className: 'modal-overlay',
      hidden: toggle(!model.isOpen, 'hidden'),
      onClick: () => address(Close)
    }),
    html.dialog({
      className: classed({
        'modal-main modal-main--menu': true,
        'modal-main--close': !model.isOpen
      }),
      open: toggle(model.isOpen, 'open')
    }, [
      html.div({
        className: 'panels--main'
      }, [
        html.div({
          className: 'panel--main panel--lv0'
        }, [
          html.header({
            className: 'panel--header'
          }, [
            html.h1({
              className: 'panel--title'
            }, [
              localize('Export CSV')
            ])
          ]),
          html.div({
            className: 'panel--content'
          }, [
            html.ul(
              {
                className: 'menu-list'
              },
              Config.chart.map(config => renderExport(
                environmentID,
                config.variable,
                config.title
              ))
            )
          ])
        ])
      ])
    ])
  ])
}

const renderExport = (environmentID, variable, title) =>
  html.li({

  }, [
    html.a({
      target: '_blank',
      href: templateCsvUrl(environmentID, variable)
    }, [
      title
    ])
  ]);

const templateCsvUrl = (environmentID, variable) =>
  Template.render(Config.environmental_data_point.origin_by_variable_csv, {
    origin_url: Config.origin_url,
    startkey: JSON.stringify([environmentID, variable, 'measured', {}]),
    endkey: JSON.stringify([environmentID, variable, 'measured']),
    limit: MAX_DATAPOINTS,
    group_level: 4,
    descending: true
  });

const readVariable = d => d.variable;
