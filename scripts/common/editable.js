/* @flow */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


import * as Unknown from "../common/unknown";
import {Effects, forward} from "reflex";

export class Selection {
  constructor(start, end, direction) {
    this.start = start
    this.end = end
    this.direction = direction
  }
}

export class Model {
  constructor(value, selection) {
    this.value = value
    this.selection = selection
  }
}

Model.empty = new Model("", new Selection(0, 0, "none"));

// Actions

export const Clear = { type: "Clear" };

export const Select =
  ( selection ) =>
  ( { type: "Select"
    , select: selection
    }
  );

export const Change =
  ( change ) =>
  ( { type: "Change"
    , change
    }
  );

const select =
  ( model, selection) =>
  [ new Model(model.value, selection)
  , Effects.none
  ]

export const change =
  ( model, value, selection ) =>
  [ new Model(value, selection)
  , Effects.none
  ]

export const clear =
  ( model ) =>
  [ Model.empty
  , Effects.none
  ];

export const init =
  ( value="", selection=null ) =>
  [ new Model
    ( value
    , ( selection == null
      ? new Selection(value.length, value.length, "none")
      : selection
      )
    )
  , Effects.none
  ];

export const update =
  (model, action) => {
    switch (action.type) {
      case "Clear":
        return clear(model);
      case "Select":
        return select(model, action.select);
      case "Change":
        return change(model, action.change.value, action.change.selection);
      default:
        return Unknown.update(model, action);
    }
  }

export const onSelect =
  (address) =>
  forward(address, decodeSelectEvent)

export const onChange =
  (address) =>
  forward(address, decodeChangeEvent)

export const decodeChangeEvent =
  (event) =>
  ( { type: "Change"
    , change: new Model
        ( event.target.value
        , readSelection(event.target)
        )
    }
  )

export const decodeSelectEvent =
  (event) =>
  ( { type: "Select"
    , select: readSelection(event.target)
    }
  )

export const readChange =
  (value, selection) =>
  new Model(value, selection)

export const readSelection =
  (input) =>
  new Selection
  ( input.selectionStart
  , input.selectionEnd
  , input.selectionDirection || 'none'
  )
