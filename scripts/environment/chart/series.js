import zipObject from 'lodash/zipObject';
import last from 'lodash/last';
import {LineGroup} from './line-group';
import {FixedBuffer} from './fixed-buffer';
import {isNullish} from '../../common/maybe';

// Constructs a series of groups.
// Note that direct construction via constructor function isn't very useful,
// because constructor requires instances of Group.
// To construct a series from an array, use `Series.from(array, limit)`.
export class Series {
  constructor(index, order) {
    // @NOTE NEVER MUTATE SERIES DIRECTLY. Always use SeriesView.
    // provided on the instance.
    this.order = order;
    this.index = index;
    this._mut = 0;
  }

  advanceMut(datum) {
    const group = this.index[datum.variable];
    if (group) {
      const mut = group._mut;
      group.advanceMut(datum);

      if (group._mut !== mut) {
        this._mut = this._mut + 1;
      }
    }

    return this;
  }

  reduce(step, state) {
    for (var i = 0; i < this.order.length; i++) {
      state = step(state, this.index[this.order[i]]);
    }
    return state;
  }
}

// Measure the extent (min and max) across the entire series.
// Includes measured and desired datapoints.
// Returns a 2-array with min on left and max on right.
Series.extent = (series, readX) =>
  series.reduce((extent, group) => {
    // Note that for these sorted buffers, left = old, right = new.
    const measured = FixedBuffer.values(group.measured);
    const desired = FixedBuffer.values(group.desired);

    if (measured.length > 0) {
      // Choose smaller and assign
      extent[0] = minNumber(extent[0], readX(measured[0]));
      // Choose larger and assign
      extent[1] = maxNumber(extent[1], readX(last(measured)));
    }

    // Do the same for desired.
    if (desired.length > 0) {
      extent[0] = minNumber(extent[0], readX(desired[0]));
      extent[1] = maxNumber(extent[1], readX(last(desired)));
    }

    return extent;
  }, []);

// Get the minimum of two numbers (which may be nullish).
// Null values are treated as "greater than", favoring numbers.
const minNumber = (x, y) => (isNullish(x) || x > y ? y : x);

// Get the max of two numbers (which may be nullish).
// Null values are treated as "less than", favoring numbers.
const maxNumber = (x, y) => (isNullish(x) || x < y ? y : x);

// Return a list of groups in series.
// @NOTE Don't mutate these groups. Treat them as read-only. Seriously.
Series.groups = series => series.order.map(key => series.index[key]);

// Reads flat sorted array of datapoints into chart groups.
// Chart groups are configured via openag-config.json.
Series.from = (array, configs, limit) => {
  // First, create an array of keys.
  const keys = configs.map(readConfigVariable);

  // Construct an array of empty group instances for each config object.
  const instances = configs.map(config => LineGroup.assemble(
    [],
    [],
    config.variable,
    config.title,
    config.unit,
    config.min,
    config.max,
    config.color,
    limit   
  ));

  const index = zipObject(keys, instances);

  // Construct new groups object from index and keys.
  const series = new Series(index, keys);

  // Loop through the array, mutating our group.
  for (var i = 0; i < array.length; i++) {
    series.advanceMut(array[i]);
  }

  // Return fully-populated group.
  return series;
}

export class SeriesView {
  constructor(series) {
    this.data = series;
  }

  advance(datum) {
    const mut = this.data._mut;
    this.data.advanceMut(datum);
    if (this.data._mut !== mut) {
      return new SeriesView(this.data);
    }
    else {
      return this;
    }
  }

  advanceMany(data) {
    const mut = this.data._mut;

    for (var i = 0; i < data.length; i++) {
      this.data.advanceMut(data[i]);
    }

    if (this.data._mut !== mut) {
      return new SeriesView(this.data);
    }
    else {
      return this;
    }
  }

  reduce(step, state) {
    return this.data.reduce(step, state);
  }
}

SeriesView.groups = seriesView =>
  Series.groups(seriesView.data);

SeriesView.from = (array, configs, limit) =>
  new SeriesView(Series.from(array, configs, limit));

SeriesView.extent = (seriesView, readX) => Series.extent(seriesView.data, readX);

const readConfigVariable = config => config.variable;
