// Generic template for environmental data points
import {html, forward, Effects} from 'reflex';
import {merge} from '../common/prelude';
import * as Unknown from '../common/unknown';
import Chart from 'chart.js';

// Define a widget wrapper for Chart.js. This lets us define a block of code
// that doesn't get patched via virtual dom, which is important since
// chart.js manages its own lifecycle and event loop.
// See virtual-dom widgets for more
// https://github.com/Matt-Esch/virtual-dom/blob/master/docs/widget.md<Paste>
class LineChartWidget {
  constructor(data, label) {
    this.type = 'Widget';
    this.data = data;
    this.label = label;
    this.options = {
      responsive: false,
      scales: {
        xAxes: [{
            type: 'linear',
            position: 'bottom'
        }]
      }
    };
  }

  init() {
    const parent = document.createElement('div');
    const canvas = document.createElement('canvas');
    parent.appendChild(canvas);

    const chart = new Chart(canvas, {
      type: 'line',
      // Data should be of type [{x, y}]
      data: {
        datasets: [{
          label: this.label,
          data: this.data
        }]
      },
      options: this.options
    });

    this.chart = chart;

    return parent;
  }

  update(widget, el) {
    this.chart = widget.chart;
    this.chart.update(this.data);
  }

  destroy(el) {
    this.chart.destroy();
  }
}

const lineChartWidget = (data, label) => new LineChartWidget(data, label);

// Actions

// Add a datapoint
export const Add = (timestamp, value) => ({
  type: 'Add',
  timestamp,
  value
});

// Init and update functions

// Provide variable name and title for module
export const init = (variable, title) => [
  {
    variable,
    title,
    data: []
  },
  Effects.none
];

const add = (model, timestamp, value) => [
  merge(model, {
    data: model.data.concat({
      x: timestamp,
      y: value
    })
  }),
  Effects.none
];

export const update = (model, action) =>
  action.type === 'Add' ?
  add(model, action.timestamp, action.value) :
  Unknown.update(model, action);

// View

export const view = (model, address) =>
  lineChartWidget(model.data, model.title);
