import * as d3 from 'd3';
import {html, forward, Effects, thunk} from 'reflex';
import {compose} from '../lang/functional';

const S_MS = 1000;
const MIN_MS = S_MS * 60;
const HR_MS = MIN_MS * 60;
const DAY_MS = HR_MS * 24;

const SCRUBBER_HEIGHT = 40;
const TOOLTIP_SPACE = 30;
const RATIO_DOMAIN = [0, 1.0];

const VARIABLES = {
  'air_temperature': 'Air Temperature',
  'air_humidity': 'Humidity',
  'water_temperature': 'Water Temperature',
  'electrical_conductivity': 'EC',
  'potential_hydrogen': 'Potential Hydrogen',
  'illuminance': 'Light'
};

// Chart options

// The chart should show one hour's worth of datapoints per viewport width.
const interval = HR_MS;
// Set the dimensions of the chart viewport.
const width = window.innerWidth;
const height = window.innerHeight;
const tooltipHeight = 112;
const tooltipWidth = 424;
const scrubberAt = 1.0;
const xhairAt = 0.5;

export const view = (model, address) => {
  const {scrubberAt} = model;

  // Find data extent over all series.
  const extent = extentOverSeries(series, readX);

  // Calculate dimensions
  const plotWidth = calcPlotWidth(extent, interval, width);
  const plotHeight = calcPlotHeight(height, tooltipHeight);
  const svgHeight = calcSvgHeight(height);
  const tickTop = calcXhairTickTop(height, tooltipHeight);

  // Calculate scales
  const x = calcTimeScale(extent, interval, width);

  const scrubberRatioToScrubberX = d3.scaleLinear()
    .domain(RATIO_DOMAIN)
    .range([0, width - 12])
    .clamp(true);

  const xhairRatioToXhairX = d3.scaleLinear()
    .domain(RATIO_DOMAIN)
    .range([0, width])
    .clamp(true);

  const scrubberXToPlotX = d3.scaleLinear()
    .domain([0, width - 12])
    // Translate up to the point that the right side of the plot is adjacent
    // to the right side of the viewport.
    .range([0, plotWidth - width])
    .clamp(true);

  const plotX = scrubberRatioToPlotX(scrubberAt);

  return html.div({
    className: 'chart',
    style: {
      width: px(width),
      height: px(height)
    }
  }, [
    html.svg({
      className: 'chart-plot',
      style: {
        // Translate SVG to move the visible portion of the plot in response
        // to scrubber.
        transform: translateXY(-1 * plotX, 0)
      }
    }, series.map(viewGroup)),
    html.div({
      className: 'chart-xhair'
    }),
    html.div({
      className: 'chart-xhair--tick'
    }),
    html.div({
      className: 'chart-tooltip',
      style: {
        width: px(tooltipWidth),
        height: px(tooltipHeight)
      }
    }, [
      html.div({
        className: 'chart-timestamp'
      }, [
        html.div({
          className: 'chart-timestamp--time'
        }),
        html.div({
          className: 'chart-timestamp--day'
        })
      ])
    ]),
    html.div({
      className: 'chart-scrubber'
    }, [
      html.div({
        className: 'chart-progress'
      }),
      html.div({
        className: 'chart-handle'
      }, [
        html.div({
          className: 'chart-handle--cap'
        }),
        html.div({
          className: 'chart-handle--line'
        })
      ])
    ])
  ]);
}

const readX = d => d.timestamp;
const readY = d => Number.parseFloat(d.value);

const clamp = (v, min, max) => Math.max(Math.min(v, max), min);
const isNumber = x => (typeof x === 'number');

// Round to 2 decimal places.
const round2x = float => Math.round(float * 100) / 100;

const getGroupColor = group => group.color;
const getGroupTitle = group => group.title;
const getGroupMeasured = group => group.measured;
const getGroupDesired = group => group.desired;

// Flatten an array of arrays into a 1d array.
const flatten = arrays => Array.prototype.concat.apply(Array, arrays);

// Calculate the extent over the whole chart series. In other words, find the
// lowest value and the highest value for the series.
const extentOverSeries = (series, readX) =>
  d3.extent(flatten(series.map(getGroupMeasured)), readX);

const calcPlotWidth = (extent, interval, width) => {
  const durationMs = extent[1] - extent[0];
  const pxPerMs = (width / interval);
  const plotWidth = durationMs * pxPerMs;
  return Math.round(plotWidth);
}

// Make room for tooltip and some padding
const calcPlotHeight = (height, tooltipHeight) =>
  height - (tooltipHeight + SCRUBBER_HEIGHT + (TOOLTIP_SPACE * 2));

const calcSvgHeight = height => height - SCRUBBER_HEIGHT;

const calcXhairTickTop = (height, tooltipHeight) =>
  height - (tooltipHeight + SCRUBBER_HEIGHT + 10 + 3 + TOOLTIP_SPACE);

// Calculate the x scale over the whole chart series.
const calcTimeScale = (domain, interval, width) => {
  return d3.scaleTime()
    .domain(domain)
    .range([0, calcPlotWidth(domain, interval, width)]);
}

const calcTooltipX = (x, width, tooltipWidth) =>
  clamp(x - (tooltipWidth / 2), 0, width - (tooltipWidth));

const findDataPointFromX = (data, currX, readX) => {
  if (data.length > 0) {
    // Used for deriving y value from x position.
    const bisectDate = d3.bisector(readX).left;
    const i = bisectDate(data, currX, 1);
    const d0 = data[i - 1];
    const d1 = data[i];
    // Pick closer of the two.
    const d = currX - readX(d0) > readX(d1) - currX ? d1 : d0;
    return d;
  }
  else {
    return null;
  }
}

const formatTime = d3.timeFormat('%I:%M %p');
const formatDay = d3.timeFormat("%A %b %e, %Y");

const px = n => n + 'px';
const translateXY = (x, y) => 'translateX(' + x + 'px) translateY(' + y + 'px)';