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
export const classed = descriptor =>
  reducekv(descriptor, addClassnameIfNeeded, []).join(' ');

// Create an optional attribute.
// Usage:
//
//     {
//       hidden: toggle(!model.isOpen, 'hidden')
//     }
export const toggle = (isPresent, attrValue) =>
  // Returning void(0) means return value won't create a field in the object.
  // This is important, because any value for the field will result in an
  // attribute with an empty string value, and in HTML5, all that is required
  // for many attributes is that the attribute exist.
  // Yes this is a gross workaround, but at least it's localized.
  isPresent ? attrValue : void(0);