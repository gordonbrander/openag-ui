/*
Chart toolbox (export, etc)
*/
import {html, forward, Effects, thunk} from 'reflex';
import {localize} from '../common/lang';

export const view = (model, address) =>
  html.menu({
    className: 'chart-toolbox'
  }, [
    html.li({
      className: 'chart-toolbox--cmd chart-toolbox--cmd-export ir'
    }, [
      localize('Export CSV')
    ])
  ]);