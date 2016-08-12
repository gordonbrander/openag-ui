import {html, forward, Effects, thunk} from 'reflex';
import {merge, tag, batch} from './common/prelude';
import * as Config from '../openag-config.json';
import * as Indexed from './common/indexed';
import * as Unknown from './common/unknown';
import {cursor} from './common/cursor';
import {compose} from './lang/functional';
import * as Environment from './environments/environment';

// Actions and tagging functions

const IndexedAction = tag('Indexed');
const ActivateIndexed = compose(IndexedAction, Indexed.Activate);

const AlertBanner = tag('AlertBanner');

// Address a specific environment by id.
export const EnvironmentByID = (id, source) => ({
  type: 'EnvironmentByID',
  id,
  source
});

export const EnvironmentAction = (id, action) =>
  action.type === 'AlertBanner' ?
  AlertBanner(action.source) :
  EnvironmentByID(id, action);

const ToActive = action => ({
  type: 'ToActive',
  source: action
});

export const Restore = compose(ToActive, Environment.Restore);

// Tag actions by id
// @TODO figure out how to generalize this.
const ByID = id => action => EnvironmentAction(id, action);

const CreateEnvironment = id => ({
  type: 'CreateEnvironment',
  id
});

// Model init and update functions

export const init = () => {
  // We hard-code the active environment for now.
  const activeID = Config.active_environment;
  const [active, activeFx] = Environment.init(activeID);
  const model = Indexed.Model([active], activeID);
  return [model, activeFx.map(ByID(activeID))];
}

export const update = (model, action) =>
  action.type === 'Indexed' ?
  updateIndexed(model, action.source) :
  action.type === 'ToActive' ?
  toActive(model, action.source) :
  action.type === 'EnvironmentByID' ?
  updateEnvironmentByID(model, action.id, action.source) :
  action.type === 'CreateEnvironment' ?
  createEnvironment(model, action.id) :
  Unknown.update(model, action);

const updateIndexed = cursor({
  get: model => model,
  set: (model, patch) => merge(model, patch),
  update: Indexed.update,
  tag: IndexedAction
});

const toActive = (model, action) =>
  // Forward to active model
  update(model, EnvironmentByID(model.active, action));

const createEnvironment = (model, id) => {
  const [environment, environmentFx] = Environment.init(id);
  const next = Indexed.add(model, id, environment);
  return [
    next,
    environmentFx.map(ByID(id))
  ];
}

const updateEnvironmentByID = (model, id, action) =>
  Indexed.updateWithID(Environment.update, ByID(id), model, id, action);

// View

export const view = (model, address) => {
  const active = Indexed.getActive(model);

  return html.div({
    className: 'environments-main'
  }, active ?
    [
      Environment.view(
        active,
        forward(address, ByID(active.id))
      )
    ] :
    []
  );
}
