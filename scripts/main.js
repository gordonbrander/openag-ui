import * as Config from '../openag-config.json';
import {start, Effects} from 'reflex';
import {Renderer} from 'reflex-virtual-dom-driver';
import * as Devtools from './devtools';
import * as App from './app';

// Start app
const application = start({
  flags: { Debuggee: App },
  init: Devtools.init,
  // If in debug mode, log all actions and effects.
  update: Devtools.update,
  view: Devtools.view
});

window.application = application;

const renderer = new Renderer({target: document.body});
application.view.subscribe(renderer.address);
application.task.subscribe(Effects.driver(application.address));
