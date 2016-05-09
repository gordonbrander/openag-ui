# Design Files

This folder provides source files for icons and other design assets.

## sprite.psd

This file is a sprite image used for icons.

Icons:

- Icons should have a line width of 5px.
- Whitespace and sizings are usually in increments of 4px.
- The dashboard and data icons are sized to `72px 72px`.

Sprite file:

- Artboard should be sized in units of `200px`.
- Always append to the end of the artboard (otherwise you'll have to
  re-position all of the other icons in the CSS).
- It helps to create a magenta matte box behind the icon to help position it
  with the correct whitespace. Hide this box when exporting.
- Dark icons are filled with `#000` and set to 60% opacity.
