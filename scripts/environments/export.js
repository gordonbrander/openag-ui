import {html, forward, Effects, Task, thunk} from 'reflex';
import * as Config from '../../openag-config.json';
import * as Template from '../common/stache';
import {merge, tag, tagged} from '../common/prelude';
import * as ClassName from '../common/classname';
import * as Modal from '../common/modal';
import {localize} from '../common/lang';
import * as Unknown from '../common/unknown';

export const init = () => [
  {
    isOpen: false
  },
  Effects.none
];

export const update = Modal.update;

export const view = (model, address) =>
  html.dialog({
    className: ClassName.create({
      'modal-main': true,
      'modal-main--close': !model.isOpen
    }),
    open: (model.isOpen ? 'open' : void(0))
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
        ])
      ])
    ])
  ]);