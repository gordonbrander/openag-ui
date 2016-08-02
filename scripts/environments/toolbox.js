/*
Chart toolbox (export, etc)
*/
import {html, forward, Effects, thunk} from 'reflex';
import {localize} from '../common/lang';
import * as Template from '../common/stache';

const MAX_DATAPOINTS = 100000;

export const OpenExporter = {
  type: 'OpenExporter'
};

export const view = (model, address) =>
  html.menu({
    className: 'chart-toolbox'
  }, [
    html.li({
    }, [
      html.a({
        onClick: event => {
          event.preventDefault();
          address(OpenExporter);
        },
        className: 'chart-toolbox--cmd chart-toolbox--cmd-export ir',
        title: localize('Export CSV')
      }, [
        localize('Export CSV')
      ])
    ])
  ]);
