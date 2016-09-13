/*
Exports the Group class, which is used for chart groups.
*/
import last from 'lodash/last';
import {FixedBuffer} from './fixed-buffer';
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
      const prev = last(this.desired);
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

  swap(measured, desired) {
    return new LineGroup(
      measured,
      desired,
      this.variable,
      this.title,
      this.unit,
      this.min,
      this.max,
      this.color
    );
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

  // Advance group buffer, returning new group.
  // Returns new group instance.
  advance(datum) {
    if (this.shouldUpdate(datum)) {
      if (datum.is_desired) {
        return this.swap(this.measured, this.desired.advance(datum));
      }
      else {
        return this.swap(this.measured.advance(datum));
      }
    }
    else {    
      return this;
    }
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
  new FixedBuffer(measured, limit),
  new FixedBuffer(desired, limit),
  variable,
  title,
  unit,
  min,
  max,
  color
);

LineGroup.calcLength = group => (
  FixedBuffer.values(group.measured).length +
  FixedBuffer.values(group.desired).length
);