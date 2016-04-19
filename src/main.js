import * as Config from '../openag-config.json';
import * as PouchDb from 'pouchdb';
import {start, Effects} from 'reflex';
import {Renderer} from 'reflex-virtual-dom-driver';
import * as App from './app';

// @TODO this a a temporary measure. Later we may want to replace this with
// record and replay functionality.
const logger = update => (model, action) => {
  console.log('>> Action', action);
  const next = update(model, action);
  const [nextModel, nextFx] = next;
  console.log('<< Effects', nextFx);
  return next;
}

// Start app
const application = start({
  init: App.init,
  // If in debug mode, log all actions and effects.
  update: Config.debug ? logger(App.update) : App.update,
  view: App.view
});

window.application = application;

const renderer = new Renderer({target: document.body});
application.view.subscribe(renderer.address);
application.task.subscribe(Effects.driver(application.address));
