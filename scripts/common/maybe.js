// Maybe chaining for values that could be null.

export const isSomething = x => x != null;
export const isNullish = x => x == null;

// Map a value with function if value is not null. Otherwise return null.
export const map = (v, a2b) => isSomething(v) ? a2b(v) : null;
export const or = (v, fallback) => isSomething(v) ? v : fallback;
export const mapOr = (v, a2b, fallback) => or(map(v, a2b), fallback);