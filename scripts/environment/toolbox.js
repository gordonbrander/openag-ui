/*
Chart toolbox (export, etc)
*/
import {html, forward, Effects, thunk} from 'reflex';
import {localize} from '../common/lang';
import {port} from '../common/prelude';
import * as Template from '../common/stache';

const MAX_DATAPOINTS = 100000;

export const OpenExporter = {
  type: 'OpenExporter'
};

export const view = (model, address) => {
  const sendPoint = onPoint(address);
  return html.menu({
    className: 'chart-toolbox'
  }, [
    html.li({
    }, [
      html.a({
        onTouchStart: sendPoint,
        onMouseDown: sendPoint,
        className: 'chart-toolbox--cmd chart-toolbox--cmd-export ir',
        title: localize('Export CSV')
      }, [
        localize('Export CSV')
      ])
    ])
  ]);
}

const onPoint = port(event => {
  event.preventDefault();
  return OpenExporter;
})