/*
Timeseries is an array of line groups.
*/
import {max, min} from 'd3-array';
import flatMap from 'lodash/flatMap';
import values from 'lodash/values';
import get from 'lodash/get';
import set from 'lodash/set';
import * as Line from './line';
import {cid} from '../../lang/cid';
import * as Point from './point';
import * as Doc from '../doc';

export class Series {
  // A bare-bones constructor that makes it cheap to create new instances
  // without recreating indexes, etc. If you want to create a series instance
  // from a list of lines, use `assemble`.
  constructor(lines, index, min, max) {
    this.lines = lines;
    this.index = index;
    this.min = min;
    this.max = max;
    this.rev = cid();
  }

  // Reads line list as a list of groups.
  // WARNING: MUTATING THE LINES AFTER READING GROUPS OUT WILL MUTATE SERIES.
  // ALWAYS USE METHODS ON SERIES FOR MUTATION.
  asGroups() {
    const subindexes = values(this.index);
    const groups = subindexes.map(subindex => ({
      measured: this.lines[subindex.measured],
      desired: this.lines[subindex.desired]
    }));
    return groups;
  }

  // Look up line by index
  lookupLine(variable, is_desired) {
    const type = is_desired ? 'desired' : 'measured';
    const i = get(this.index, [variable, type]);
    if (i != null) {
      return this.lines[i];
    }
  }

  updateMin(min) {
    if (min < this.min) {
      this.min = min;
      this.rev = cid();
    }
    return this;
  }

  updateMax(max) {
    if (max > this.max) {
      this.max = max;
      this.rev = cid();
    }
    return this;
  }

  // Append a reading to a line.
  // Creates a point, appends it to the correct line and updates min/max.
  // This method does not advance other lines in lock-step.
  append(timestamp, value, variable, is_desired) {
    const line = this.lookupLine(variable, is_desired);
    if (line) {
      line.append(new Point.Point(timestamp, value));
      this.rev = cid();
      this.updateMin(timestamp);
      this.updateMax(timestamp);      
    }
    return this;
  }

  // Carry forward all `groups` to `timestamp`.
  tick(timestamp) {
    const lines = this.lines;
    for (var i = 0; i < lines.length; i++) {
      lines[i].tick(timestamp);
    }
    this.updateMax(timestamp);
    this.rev = cid();
    return this;
  }

  // Trigger a "garbage collection" when limit is exceeded by n elements.
  downsample(limit) {
    this.lines = this.lines.map(line => line.downsample(limit));
    this.rev = cid();
    return this;
  }
}

// Assemble a new Series class instance.
// This function takes care of indexing lines, etc.
export const assemble = (lines) => {
  const index = indexByVariableAndType(lines);
  const s = Date.now();
  return new Series(lines, index, s, s);
}

// Assemble an empty series from a list of config objects.
// Creates one measured and one desired line for each config object.
export const fromConfigs = (configs) =>
  assemble(
    flatMap(configs, config => [
      new Line.Line(
        [],
        config.variable,
        false, // is desired?
        config.title,
        config.unit,
        config.min,
        config.max,
        config.color
      ),
      new Line.Line(
        [],
        config.variable,
        true, // is desired?
        config.title,
        config.unit,
        config.min,
        config.max,
        config.color
      )
    ])
  );

// Create an index of array indices by variable and type. Creates an index
// that looks like:
//
//     {'air_temperature': {measured: 0, desired: 1}, ...}
const indexByVariableAndType = (lines) => {
  const index = {};
  for (var i = 0; i < lines.length; i++) {
    const line = lines[i];
    const variable = line.variable;
    const type = line.is_desired ? 'desired' : 'measured';
    // Set deep
    set(index, [variable, type], i);
  }
  return index;
}

const stepLength = (state, line) => state + line.points.length;

export const calcLength = (series) =>
  series.lines.reduce(stepLength, 0);

export const advanceSeries = (series, docs, now, limit) => {
  for (var i = 0; i < docs.length; i++) {
    const doc = docs[i];
    // Note we read doc timestamp (seconds) as point timestamp (ms).
    series.append(Doc.xMs(doc), Doc.y(doc), Doc.variable(doc), Doc.isDesired(doc));
  }
  // Downsample lines if above limit
  series.downsample(limit);
  // Line up the ends of all lines.
  series.tick(now);
  return series;
}