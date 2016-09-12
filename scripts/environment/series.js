import zipObject from 'lodash/zipObject';
import defaults from 'lodash/defaults';
import {LineGroup} from '../environment/line-group';

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

  advance(datum) {
    const group = this.index[datum.variable];
    if (group) {
      const variable = readConfigVariable(group);
      return new LineGroup(
        defaults({[variable]: group.advance(datum)}, group.index),
        group.order
      );
    }
    else {
      return this;
    }
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
}

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
}

SeriesView.groups = seriesView =>
  Series.groups(seriesView.data);

SeriesView.from = (array, configs, limit) =>
  new SeriesView(Series.from(array, configs, limit));

SeriesView.reduce = (seriesView, step, state) => {
  const series = seriesView.data;
  for (var i = 0; i < series.order.length; i++) {
    state = step(state, series.index[series.order[i]]);
  }
  return state;
}

const readConfigVariable = config => config.variable;
