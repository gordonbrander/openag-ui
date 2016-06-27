// Generic template for environmental data points
import {html, forward, Effects} from 'reflex';
import {merge, tag} from '../common/prelude';
import * as Ordered from '../common/ordered';
import * as Unknown from '../common/unknown';
import Rickshaw from 'rickshaw';

// Limit for number of datapoints to keep for dashboard render.
const MAX = 500;

// Define a widget wrapper for Chart.js. This lets us define a block of code
// that doesn't get patched via virtual dom, which is important since
// chart.js manages its own lifecycle and event loop.
// See virtual-dom widgets for more
// https://github.com/Matt-Esch/virtual-dom/blob/master/docs/widget.md
class LineChartWidget {
  constructor(label, data) {
    this.type = 'Widget';
    this.label = label;
    this.data = data;
  }

  init() {
    const element = document.createElement('div');

    const series = [
      {
        renderer: 'line',
        name: this.label,
        color: '#0052b3',
        data: toArrayOrderedByX(this.data)
      }
    ];

    const graph = new Rickshaw.Graph({
      element,
      series,
      width: window.innerWidth,
      height: 250,
      // preserve: true,
      renderer: 'line',
      interpolation: 'linear',
      min: 0,
      max: 50
    });

    const detail = new Rickshaw.Graph.HoverDetail({
      graph: graph
    });

    this.graph = graph;

    return element;
  }

  update(widget, el) {
    this.graph = widget.graph;
    if (widget.data !== this.data) {
      this.graph.series[0].data = toArrayOrderedByX(this.data);
      this.graph.render();
    }
  }

  destroy(el) {
    this.graph.destroy();
  }
}

// Actions

// Add a datapoint
/*
Example datapoint:

    {
      _id: "1466094635.68-590041682",
      _rev: "1-d843590a603547494a34c87a27593df5",
      environment: "environment_1",
      // Measured or desired?
      is_desired: false,
      timestamp: 1466094635.681755,
      value: "22.2000007629",
      variable: "air_temperature"
    }
*/
export const Add = tag('Add');
export const InsertMany = tag('InsertMany');

// Init and update functions

// Provide variable name and title for module
export const init = (variable, title) => [
  {
    variable,
    title,
    measured: {},
    desired: {}
  },
  Effects.none
];

export const update = (model, action) =>
  action.type === 'Add' ?
  add(model, action.source) :
  action.type === 'InsertMany' ?
  insertMany(model, action.source) :
  Unknown.update(model, action);

const addMeasured = (model, dataPoint) => [
  merge(model, {
    measured: Ordered.insertNew(model.measured, readDataPoint(dataPoint), getX)
  }),
  Effects.none
];

const addDesired = (model, dataPoint) => [
  merge(model, {
    desired: Ordered.insertNew(model.desired, readDataPoint(dataPoint), getX)
  }),
  Effects.none
];

const add = (model, dataPoint) =>
  dataPoint.is_desired ?
  addDesired(model, dataPoint) :
  addMeasured(model, dataPoint);

const insertMany = (model, dataPoints) => {
  // Could benefit from reducers here?
  const measured = dataPoints.filter(isMeasured).map(readDataPoint);
  const desired = dataPoints.filter(isDesired).map(readDataPoint);

  const next = merge(model, {
    desired: Ordered.insertMany(model.desired, desired, getX),
    measured: Ordered.insertMany(model.measured, measured, getX)
  });

  return [next, Effects.none];
}

// View

export const view = (model, address) =>
  new LineChartWidget(model.title, model.measured);

// Helpers

const getX = chartPoint => chartPoint.x;
const isDesired = dataPoint => dataPoint.is_desired;
const isMeasured = dataPoint => !dataPoint.is_desired;

const readDataPoint = ({timestamp, value}) => ({
  x: Math.floor(timestamp),
  y: Number.parseFloat(value)
});

// Sort by x (timestamp) desc.
const compareByX = (a, b) => a.x > b.x ? 1 : -1;

const toArrayOrderedByX = object => Ordered.toArray(object, compareByX);
