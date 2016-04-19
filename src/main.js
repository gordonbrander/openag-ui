import * as PouchDb from 'pouchdb';
import {start, Effects} from 'reflex';
import {Renderer} from 'reflex-virtual-dom-driver';
import * as App from './app';

// Start app
const application = start({
  init: App.init,
  update: App.update,
  view: App.view
});

window.application = application;

const renderer = new Renderer({target: document.body});
application.view.subscribe(renderer.address);
application.task.subscribe(Effects.driver(application.address));
