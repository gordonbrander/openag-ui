The architecture of this JavaScript app is heavily inspired by
[Elm's app architecture](https://github.com/evancz/elm-architecture-tutorial).

We use the following libraries:

- [reflex](http://github.com/gozala/reflex), which provides a JavaScript
  interpretation of Elm's StartApp package.
- [reflex-virtual-dom-driver](https://github.com/Gozala/reflex-virtual-dom-driver),
  which uses the [VirtualDom](https://github.com/Matt-Esch/virtual-dom) library
  as a rendering backend.

The Elm Architecture is a simple pattern for infinitely nestable components.
It is great for modularity, code reuse, and testing. Ultimately, this
pattern makes it easy to create complex web apps in a way that stays modular.

# Modules

Each module is made up of 3 simple functions:

- `init(...)` creates the initial state of the module. It returns a model object
  (usually a simple JavaScript object) and an Effect (we'll talk about those later).
- `update(model, action)` handles updating the model. It takes a model and an
  `action` (a message of some kind) and returns a new model.
- `view(model, address)` takes a model and returns a Virtual Dom representation
  of the view. `address` is a function that can be used in event handlers.

You can pretty reliably start with the following skeleton and then iteratively
fill in details for your particular case.

```js
import {html, Effects} from 'reflex';
import * as Unknown from '../common/unknown';
import {merge} from '../common/prelude';

export const Reset = {
  type: 'Reset'
};

export const init = () => [
  {
    value: ''
  },
  Effects.none
];

export const update = (model, action) =>
  action.type === 'Reset' ?
  [merge(model, {value: ''}), Effects.none] :
  Unknown.update(model, action);

export const view = (model, address) =>
  html.div({
    onClick: address(Reset)
  }, [
    model.value
  ]);
```

## Examples

https://github.com/Gozala/reflex-virtual-dom-driver/tree/master/examples

## Naming things

You'll see these action names used a lot. Sticking to the naming convention makes
code easier to read.

- `Configure` for configuration from parent (usually restored from database).
- `Ok`, `Error` are for `Result` actions (which can be either error or ok).
- `Get`, `Put`, `Post` and `Got`, `Putted`, `Posted` for http tasks and results thereof.
- `Push`, `Pull` and `Pushed`, `Pulled` for uni-directional syncing PouchDB/CouchDB.
- `Sync` and `Synced` for doing a bi-directional PouchDB/CouchDB sync.
- `Restore`, `Restored` for doing an `allDocs` full restore to in-memory model from local database.