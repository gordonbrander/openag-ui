import * as PouchDb from 'pouchdb';
import {start, Effects} from 'reflex';
import {Renderer} from 'reflex-virtual-dom-driver';
import * as App from './app';

// Start app
const app = start({
  init: App.init,
  update: App.update,
  view: App.view
});

app.view.subscribe(new Renderer({target: document.body}));
