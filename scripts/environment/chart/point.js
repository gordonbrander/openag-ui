import * as Doc from '../doc';
import {bisector} from 'd3-array';
import {round2x} from '../../lang/math';

// A single datapoint.
export class Point {
  constructor(timestamp, value) {
    // Timestamp in seconds
    this.timestamp = timestamp;
    this.value = value;
  }
}

// Accessor functions for x and y
// Timestamp is unix epoch in seconds.
export const x = point => point.timestamp;
// Value is float
export const y = point => point.value;

// Create a bisector function for x accessor.
const bisectDate = bisector(x);

// Read document object to point instance
// Note that database document timestamps are epoch in seconds, whereas points
// use the JavaScript convention of epoch in MS.
export const docToPoint = doc => new Point(Doc.xMs(doc), Doc.y(doc));

// Carry a datapoint forward to `timestamp`. Copies the datapoint
// `point` at a given time `timestamp`.
export const carryForward = (point, timestamp) => new Point(
  timestamp,
  point.value
);

// Given a list of points, find the nearest point for a given x position.
// Returns point or undefined if nothing found.
export const findPointForX = (points, xCoord) => {
  if (points.length > 0) {
    const i = bisectDate.left(points, xCoord, 1);
    const p0 = points[i - 1];
    const p1 = points[i];

    if (p0 && p1) {
      // Pick closer of the two.
      return (xCoord - x(p0)) > (x(p1) - xCoord) ? p1 : p0;
    }
  }
}

// Display y value for x coord, suitable for display. Returns a string.
export const displayYForX = (points, xCoord, unit) => {
  const point = findPointForX(points, xCoord);
  if (point != null) {
    const rounded = round2x(y(point));
    return rounded + unit + '';
  }
  else {
    return '-';
  }
}