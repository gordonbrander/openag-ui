/*
Exports the Group class, which is used for chart groups.
*/
import last from 'lodash/last';
import {DownsampleBuffer} from './downsample-buffer';
import {readX} from '../datapoints';

// Construct a chart group
export class LineGroup {
  constructor(
    // Measured and desired should ALWAYS be sorted descending by readX.
    measured,
    desired,
    variable,
    title,
    unit,
    min,
    max,
    color
  ) {
    this.measured = measured;
    this.desired = desired;
    this.variable = variable;
    this.title = title;
    this.unit = unit;
    this.min = min;
    this.max = max;
    this.color = color;
    // Mutation counter. How many times has this instance been mutated?
    this._mut = 0;
  }

  shouldUpdate(datum) {
    if (datum.variable === this.variable) {
      const buffer = datum.is_desired ? this.desired : this.measured;
      const prev = last(buffer);
      if (!prev) {
        return true;
      }
      else {
        return readX(prev) < readX(datum);
      }
    }
    else {
      return false;
    }
  }

  // Advance group buffers, mutating group.
  // Returns mutated group instance.
  advanceMut(datum) {
    if (this.shouldUpdate(datum)) {
      // Advance mutation counter.
      this._mut = this._mut + 1;

      if (datum.is_desired) {
        this.desired.advanceMut(datum);
      }
      else {
        this.measured.advanceMut(datum);
      }
    }
    return this;
  }
}

// Assemble a new group from 2 arrays and config.
// Returns a new group instance.
LineGroup.assemble = (
  measured,
  desired,
  variable,
  title,
  unit,
  min,
  max,
  color,
  limit
) => new LineGroup(
  new DownsampleBuffer(measured, limit),
  new DownsampleBuffer(desired, limit),
  variable,
  title,
  unit,
  min,
  max,
  color
);

LineGroup.calcLength = group => (
  DownsampleBuffer.values(group.measured).length +
  DownsampleBuffer.values(group.desired).length
);