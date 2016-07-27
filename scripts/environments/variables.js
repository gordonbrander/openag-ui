export const Model = (data, config) => ({
  data,
  config
});

export const addData = (model, data) => {
  const next = concatMonotonic(model.data, data, readX);
  return (
    next !== model.data ?
    Model(next, model.config) :
    model
  );
}

const Group = (
  measured,
  desired,
  variable,
  title,
  unit,
  min,
  max,
  color
) => ({
  measured,
  desired,
  variable,
  title,
  unit,
  min,
  max,
  color
});

// Construct a group from a config object
const readGroupFromConfig = ({
  variable,
  title,
  unit,
  min,
  max,
  color
}) => Group(
  [],
  [],
  variable,
  title,
  unit,
  min,
  max,
  color
);


// Construct a tree structure from model (useful for view)
//
// Output:
//
//     {
//       air_temperature: {
//         measured: [dataPoint, dataPoint, ...],
//         desired: [dataPoint, dataPoint, ...]
//       },
//       ...
//     }
export const read = model => {
  const {config, data} = model;
  const groupList = config.map(readGroupFromConfig);
  const groupIndex = Ordered.indexWith(groupList, getVariable);
  const populated = data.reduce(insertDataPoint, groupIndex);
  const variables = config.map(getVariable);
 return Ordered.listByKeys(populated, variables);
}

// Insert datapoint in index, mutating model. We use this function to build
// up the variable groups index.
// Returns mutated index.
const insertDataPoint = (index, dataPoint) => {
  const variable = getVariable(dataPoint);
  const group = index[variable];
  const type = dataPoint.is_desired ? 'desired' : 'measured';

  // Check that this is a known variable in our configuration
  // File datapoint away in measured or desired, making sure that it is
  // monotonic (that a new datapoint comes after any older datapoints).
  if (index[variable] && isMonotonic(index[variable][type], dataPoint, readX)) {
    index[variable][type].push(dataPoint);
  }

  return index;
}

const getVariable = x => x.variable;

const concatMonotonic = (list, additions, readX) => {
  // Get the last timestamp (use 0 as a fallback).
  // `list` is assumed to be monotonic.
  const timestamp = maybeMap(readX, last(list), -1);
  // Filter the additions to just those that occur after timestamp.
  // Sort the result.
  const after = filterAbove(additions, readX, timestamp);
  if (after.length > 0) {
    const sorted = after.sort(comparator(readX));
    list.concat(sorted);
  }
  else {
    return list;
  }
}

// Check if an item comes after the last item in an array. "Comes after" is
// defined by value returned from `readX`.
const isMonotonic = (array, item, readX) => {
  // If there is no last item in the array, then use -1 as the timestamp.
  const timestamp = maybeMap(readX, last(list), -1);
  return readX(item) > timestamp;
}

// Create a comparator for sorting from a read function.
// Returns a comparator function.
const comparator = (read) => (a, b) => {
  const fa = read(a);
  const fb = read(b);
  return (
    a > b ? 1 :
    a < b ? -1 :
    0
  );
}

const filterAbove = (array, read, value) =>
  array.filter(item => read(item) > value);

const last = array => array.length > 0 ? array[array.length - 1] : null;

// Map a value with function if value is not null. Otherwise return null.
const maybeMap = (a2b, v, fallback) => v != null ? a2b(v) : fallback;
