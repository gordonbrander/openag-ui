/*
Chart toolbox (export, etc)
*/
import * as Config from '../../openag-config.json';
import {html, forward, Effects, thunk} from 'reflex';
import {localize} from '../common/lang';
import * as Template from '../common/stache';

const MAX_DATAPOINTS = 100000;

export const view = (model, address) =>
  html.menu({
    className: 'chart-toolbox'
  }, [
    html.li({
    }, [
      html.a({
        href: templateCsvUrl(model.id),
        className: 'chart-toolbox--cmd chart-toolbox--cmd-export ir',
        target: '_blank'
      }, [
        localize('Export CSV')
      ])
    ])
  ]);

const templateCsvUrl = (environmentID) =>
  Template.render(Config.environmental_data_point.origin_range_csv, {
    origin_url: Config.origin_url,
    startkey: JSON.stringify([environmentID, {}]),
    endkey: JSON.stringify([environmentID]),
    limit: MAX_DATAPOINTS,
    descending: true
  });
