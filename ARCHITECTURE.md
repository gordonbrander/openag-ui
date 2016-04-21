The architecture of this JavaScript app is heavily inspired by
[Elm's app architecture](https://github.com/evancz/elm-architecture-tutorial).

# Modules

Each module is made up of 3 core functions:

- `init(...)` creates the initial state of the module. It returns a model object
  (usually a simple JavaScript object) and an Effect (we'll talk about those later).
- `update(model, action)` handles updating the model. It takes a model and an
  `action` (a message of some kind) and returns a new model.
- `view(model, address)` takes a model and returns a Virtual Dom representation
  of the view. `address` is a function that can be used in event handlers.
