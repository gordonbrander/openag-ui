// Generic template for environmental data points
import {html, forward, Effects} from 'reflex';
import {merge} from '../common/prelude';
import * as Unknown from '../common/unknown';
import Chart from 'chart.js';

// Limit for number of datapoints to keep for dashboard render.
const LIMIT = 500;

// Define a widget wrapper for Chart.js. This lets us define a block of code
// that doesn't get patched via virtual dom, which is important since
// chart.js manages its own lifecycle and event loop.
// See virtual-dom widgets for more
// https://github.com/Matt-Esch/virtual-dom/blob/master/docs/widget.md<Paste>
class LineChartWidget {
  constructor(datasets) {
    this.type = 'Widget';
    this.datasets = datasets;
  }

  init() {
    const parent = document.createElement('div');
    const canvas = document.createElement('canvas');
    parent.appendChild(canvas);

    const chart = new Chart(canvas, {
      type: 'line',
      // Data should be of type [{x, y}]
      data: {
        datasets: this.datasets
      },
      options: {
        responsive: false,
        // Do not show x/y grid lines
        scales: {
          yAxes: [
            {
              gridLines: {
                display: false
              }
            }
          ],
          xAxes: [{
            type: 'time',
            time: {
              displayFormats: {
                minute: 'h:mm a'
              }
            },
            gridLines: {
              display: false
            },
            position: 'bottom',
          }]
        }
      }
    });

    this.chart = chart;

    return parent;
  }

  update(widget, el) {
    this.chart = widget.chart;
    this.chart.data.datasets = this.datasets;
    this.chart.update();
  }

  destroy(el) {
    this.chart.destroy();
  }
}

const lineChartWidget = datasets => new LineChartWidget(datasets);

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
export const Add = dataPoint => ({
  type: 'Add',
  value: dataPoint
});

// Init and update functions

// Provide variable name and title for module
export const init = (variable, title) => [
  {
    variable,
    title,
    measured: [],
    desired: []
  },
  Effects.none
];

const last = array => array.length > 0 ? array[array.length - 1] : null;

const advance = (array, item, limit) => {
  // Add datapoint, creating new array.
  const next = array.concat(item);
  // If over limit, remove first item from array.
  if (next.length > limit) {
    next.shift();
  }
  return next;
}

// Check that datapoint is newer than the newest sampled datapoint in model.
const isNewer = (dataPoints, dataPoint) =>
  (dataPoints.length < 1 || (last(dataPoints).timestamp) < dataPoint.timestamp);

const readDataPoint = ({timestamp, value}) => ({
  x: timestamp,
  y: Number.parseFloat(value)
});

const addMeasured = (model, dataPoint) => {
  const next = isNewer(model.measured, dataPoint) ?
    merge(model, {
      measured: advance(model.measured, readDataPoint(dataPoint), LIMIT)
    }) :
    model;
  return [next, Effects.none];
}

const addDesired = (model, dataPoint) => {
  const next = isNewer(model.desired, dataPoint) ?
    merge(model, {
      desired: advance(model.desired, readDataPoint(dataPoint), LIMIT)
    }) :
    model;
  return [next, Effects.none];
}

const add = (model, dataPoint) =>
  dataPoint.is_desired ?
  addDesired(model, dataPoint) :
  addMeasured(model, dataPoint);

export const update = (model, action) =>
  action.type === 'Add' ?
  add(model, action.value) :
  Unknown.update(model, action);

// View

export const view = (model, address) =>
  lineChartWidget([
    {
      label: model.title,
      data: model.measured
    }
  ]);
