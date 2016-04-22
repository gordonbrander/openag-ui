import * as Lang from './variable-lang';

// @FIXME this is a temporary measure. Eventually we should add real
// localization for variable names.
export const readName = (variable) =>
  Lang[variable] ? Lang[variable] : variable;
