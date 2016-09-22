export const clamp = (v, min, max) => Math.max(Math.min(v, max), min);
export const isNumber = x => (typeof x === 'number');

// Round to 2 decimal places.
export const round2x = float => Math.round(float * 100) / 100;