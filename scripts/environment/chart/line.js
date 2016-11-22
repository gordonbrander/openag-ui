import * as Point from './point';
import last from 'lodash/last';
import {largestTriangleOneBucket} from 'd3fc-sample';

const downsample = largestTriangleOneBucket()
  .x(Point.x)
  .y(Point.y)
  // Every 10 points get reduced to 3 points.
  .bucketSize(10);

export class Line {
  constructor(
    // points should ALWAYS be sorted descending by `Point.x`.
    points,
    variable,
    is_desired,
    title,
    unit,
    min,
    max,
    color
  ) {
    this.points = points;
    this.variable = variable;
    this.is_desired = is_desired;
    this.title = title;
    this.unit = unit;
    this.min = min;
    this.max = max;
    this.color = color;
  }

  // Append a point to line if it is newer than last point.
  append(point) {
    const z = last(this.points);
    if (!z || Point.x(point) > Point.x(z)) {
      this.points.push(point);
    }
    return this;
  }

  // Bring line forward to `timestamp`.
  tick(timestamp) {
    const z = last(this.points);
    if (z && Point.x(z) < timestamp) {
      this.points.push(Point.carryForward(z, timestamp));
    }
    return this;
  }

  downsample(limit) {
    if (this.points.length > limit) {
      this.points = downsample(this.points);      
    }
    return this;
  }
}