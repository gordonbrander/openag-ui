// We have 2 different kinds of datapoint classes so that instances are
// monomorphic. This gives the JavaScript JIT an opportunity to do some
// optimization, treating instances as structs in the backend.

class StringPoint {
  constructor(variable, is_desired, is_manual, timestamp, value) {
    this.variable = variable;
    this.is_desired = is_desired;
    this.is_manual = is_manual;
    this.timestamp = timestamp;
    this.value = value;
  }
}

class NumberPoint {
  constructor(variable, is_desired, is_manual, timestamp, value) {
    this.variable = variable;
    this.is_desired = is_desired;
    this.is_manual = is_manual;
    this.timestamp = timestamp;
    this.value = value;
  }
}

export const marker = (timestamp, value) =>
  new StringPoint('marker', false, true, timestamp, value);

export const isMarker = dataPoint => dataPoint.variable === 'marker';

// @TODO readDataPoint
// reformat openag-config.json to have a hashmap and a weight field, instead
// of being an array. Then only read datapoints that exist in the chart.
// Only NumberDataPoints are supported for chart config in openag-config.json.