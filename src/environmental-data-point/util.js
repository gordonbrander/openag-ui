import * as Lang from './variable-lang';

export const readName = (variable) =>
  Lang[variable] ? Lang[variable] : variable;
