// Generate a pseudo-random integer between min and max.
// min/max inclusive.
export const genRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min +1)) + min;