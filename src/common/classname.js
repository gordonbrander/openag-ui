const reducekv = (object, step, value) => {
  const keys = Object.keys(object);
  for (let i = 0, l = keys.length; i < l; i++) {
    let key = keys[i];
    value = step(value, key, object[key]);
  }
  return value;
}

const addClassnameIfNeeded = (array, className, isSet) => {
  if (isSet) {
    array.push(className);
  }
  return array;
}

// Helper for creating HTML classname strings.
export const create = descriptor =>
  reducekv(descriptor, addClassnameIfNeeded, []).join(' ');
