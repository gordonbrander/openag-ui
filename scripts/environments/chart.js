import * as d3 from 'd3';
import {html, forward, Effects, thunk} from 'reflex';
import * as Config from '../../openag-config.json';
import {merge, tag} from '../common/prelude';
import {cursor} from '../common/cursor';
import * as Draggable from '../common/draggable';
import * as Ordered from '../common/ordered';
import * as ClassName from '../common/classname';
import * as Unknown from '../common/unknown';
import {compose} from '../lang/functional';

// Edit openag-config.json to change which environmental datapoints are rendered
// to screen.
const SERIES = Config.chart;

const S_MS = 1000;
const MIN_MS = S_MS * 60;
const HR_MS = MIN_MS * 60;
const DAY_MS = HR_MS * 24;

const SCRUBBER_HEIGHT = 40;
const TOOLTIP_SPACE = 30;
const RATIO_DOMAIN = [0, 1.0];

// Actions

export const MoveXhair = tag('MoveXhair');
export const Data = tag('Data');

const ScrubberAction = tag('Scrubber');
const MoveScrubber = compose(ScrubberAction, Draggable.Move);
const HoldScrubber = ScrubberAction(Draggable.Hold);
const ReleaseScrubber = ScrubberAction(Draggable.Release);

// Init and update functions

export const Model = (series, extentX, width, height, scrubberAt, xhairAt) => ({
  // Chart data series
  series,
  extentX,

  // Time interval to show within chart viewport (visible area)
  interval: HR_MS,

  // Define dimensions
  width: window.innerWidth,
  height: window.innerHeight,
  tooltipHeight: 112,
  tooltipWidth: 424,

  // Define chart state
  scrubber: Draggable.Model(false, scrubberAt),
  xhairAt
});

export const init = () => [
  Model([], [], window.innerWidth, window.innerHeight, 1.0, 0.5),
  Effects.none
];

export const update = (model, action) =>
  action.type === 'Scrubber' ?
  updateScrub(model, action.source) :
  action.type === 'MoveXhair' ?
  [merge(model, {xhairAt: action.source}), Effects.none] :
  action.type === 'Data' ?
  updateData(model, action.source) :
  Unknown.update(model, action);

const updateData = (model, data) => {
  // Read the extent of the data
  const extentX = d3.extent(data, readX);

  return (
    // Only update the model if the new data's extent is outside the current
    // data's extent. This way we only re-render when data changes.
    !isSameExtent(model.extentX, extentX) ?
    [
      merge(model, {
        extentX,
        series: readSeriesFromData(data)
      }),
      Effects.none
    ] :
    // Otherwise, just return the old model.
    [model, Effects.none]
  );
}

const updateScrub = cursor({
  get: model => model.scrubber,
  set: (model, scrubber) => merge(model, {scrubber}),
  update: Draggable.update,
  tag: ScrubberAction
});

// View function
export const view = (model, address) =>
  // If we have data to show, then render chart.
  model.extentX.length ?
  viewData(model, address) :
  viewEmpty(model, address);

// Handle the case where there is no data yet.
const viewEmpty = (model, address) => {
  const {width, height} = model;
  return html.div({
    className: 'chart',
    style: {
      width: px(width),
      height: px(height)
    }
  });
}

const viewData = (model, address) => {
  const {series, extentX, interval, width, height, tooltipHeight, tooltipWidth,
    scrubber, xhairAt} = model;

  const scrubberAt = scrubber.coords;
  const isDragging = scrubber.isDragging;

  // Calculate dimensions
  const plotWidth = calcPlotWidth(extentX, interval, width);
  const plotHeight = calcPlotHeight(height, tooltipHeight);
  const svgHeight = calcSvgHeight(height);
  const tickTop = calcXhairTickTop(height, tooltipHeight);

  // Calculate scales
  const x = calcTimeScale(extentX, interval, width);

  const scrubberRatioToScrubberX = d3.scaleLinear()
    .domain(RATIO_DOMAIN)
    .range([0, width - 12])
    .clamp(true);

  const scrubberX = scrubberRatioToScrubberX(scrubberAt);

  const xhairRatioToXhairX = d3.scaleLinear()
    .domain(RATIO_DOMAIN)
    .range([0, width])
    .clamp(true);

  const scrubberRatioToPlotX = d3.scaleLinear()
    .domain(RATIO_DOMAIN)
    // Translate up to the point that the right side of the plot is adjacent
    // to the right side of the viewport.
    .range([0, plotWidth - width])
    .clamp(true);

  const plotX = scrubberRatioToPlotX(scrubberAt);

  const xhairX = xhairRatioToXhairX(xhairAt);
  const tooltipX = calcTooltipX(xhairX, width, tooltipWidth);

  // Calculate xhair absolute position by adding crosshair position in viewport
  // to plot offset. Then use absolute coord in chart viewport to get inverse
  // value (time) under xhair.
  const xhairTime = x.invert(plotX + xhairX);

  const children = series.map(group => viewGroup(group, address, x, plotHeight));

  const chartSvg = svg({
    width: plotWidth,
    height: svgHeight,
    className: 'chart-svg',
    style: {
      // Translate SVG to move the visible portion of the plot in response
      // to scrubber.
      transform: translateXY(-1 * plotX, 0)
    }
  }, children);

  const readouts = series.map(group => {
    const measured = displayYValueFromX(group.measured, xhairTime, readX, readY, group.unit);
    const desired = displayYValueFromX(group.measured, xhairTime, readX, readY, group.unit);
    return renderReadout(group, measured, desired);
  });

  return html.div({
    className: 'chart',
    onMouseUp: () => address(ReleaseScrubber),
    onMouseMove: event => {
      const [mouseX, mouseY] = calcRelativeMousePos(
        event.currentTarget,
        event.clientX, event.clientY
      );

      const xhairAt = xhairRatioToXhairX.invert(mouseX);
      address(MoveXhair(xhairAt));

      const scrubberAt = scrubberRatioToScrubberX.invert(mouseX);
      address(MoveScrubber(scrubberAt));
    },
    style: {
      width: px(width),
      height: px(height)
    }
  }, [
    chartSvg,
    html.div({
      className: 'chart-xhair',
      style: {
        transform: translateXY(xhairX, 0)
      }
    }),
    html.div({
      className: 'chart-xhair--tick',
      style: {
        transform: translateXY(xhairX, tickTop)
      }
    }),
    html.div({
      className: 'chart-tooltip',
      style: {
        width: px(tooltipWidth),
        height: px(tooltipHeight),
        transform: translateXY(tooltipX, 0)
      }
    }, [
      html.div({
        className: 'chart-timestamp'
      }, [
        html.div({
          className: 'chart-timestamp--time'
        }, [formatTime(xhairTime)]),
        html.div({
          className: 'chart-timestamp--day'
        }, [formatDay(xhairTime)]),
      ]),
      html.div({
        className: 'chart-readouts'
      }, readouts)
    ]),
    html.div({
      className: 'chart-scrubber'
    }, [
      html.div({
        className: 'chart-progress',
        style: {
          width: px(scrubberX)
        }
      }),
      html.div({
        onMouseDown: () => {
          event.preventDefault();
          address(HoldScrubber);
        },
        className: ClassName.create({
          'chart-handle': true,
          'chart-handle--dragging': isDragging
        }),
        style: {
          transform: translateXY(scrubberX, 0)
        }
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

const viewGroup = (model, address, x, plotHeight) => {
  const {color, min, max, measured, desired} = model;

  const domain = isNumber(min) && isNumber(max) ?
    [min, max] : d3.extent(measured, readY);

  const y = d3.scaleLinear()
    .range([plotHeight, 0])
    .domain(domain);

  const line = d3.line()
    .x(compose(x, readX))
    .y(compose(y, readY));

  const children = measured.map(point => circle({
    className: 'chart-dot',
    r: 3,
    cx: x(readX(point)),
    cy: y(readY(point)),
    style: {
      fill: color
    }
  }));

  const desiredPath = path({
    d: line(desired),
    className: 'chart-desired',
    style: {
      stroke: color
    }
  });

  children.unshift(desiredPath);

  const measuredPath = path({
    d: line(measured),
    className: 'chart-measured',
    style: {
      stroke: color
    }
  });

  children.unshift(measuredPath);

  return g({
    className: 'chart-group'
  }, children);
}

const renderReadout = (group, measured, desired) =>
  html.div({
    className: 'chart-readout'
  }, [
    html.div({
      className: 'chart-readout--legend',
      style: {
        backgroundColor: group.color
      }
    }),
    html.span({
      className: 'chart-readout--title',
    }, [group.title]),
    html.span({
      className: 'chart-readout--measured',
      style: {
        color: group.color
      }
    }, [measured]),
    html.span({
      className: 'chart-readout--target',
      // @TODO localize
    }, ['Target:']),
    html.span({
      className: 'chart-readout--desired',
      style: {
        color: group.color
      }
    }, [desired])
  ]);

const renderAxis = (data, tick, tickFormat) =>
  g({
    className: 'chart-time-axis'
  }, []);

// Helpers

// Decorate vnode object with namespace property. This is important for SVG
// elements because it signals that VirtualDOM should create them with
// `createElementNS`. If you don't have the svg namespace property on your
// instance, SVG won't render.
const svgNS = vnode => {
  vnode.namespace = 'http://www.w3.org/2000/svg';
  return vnode;
}

// @WORKAROUND
// Define a set of SVG reflex VirtualNode elements that actually work.
// We decorate them with the svg namespace on the way out.
const svg = compose(svgNS, html.svg);
const path = compose(svgNS, html.path);
const g = compose(svgNS, html.g);
const circle = compose(svgNS, html.circle);

const readX = d =>
  // Timestamp is in seconds. For x position, read timestamp as ms.
  d.timestamp * 1000;

const readY = d =>
  Number.parseFloat(d.value);

const clamp = (v, min, max) => Math.max(Math.min(v, max), min);
const isNumber = x => (typeof x === 'number');

// Round to 2 decimal places.
const round2x = float => Math.round(float * 100) / 100;

// Given 2 extents, test to see whether they are the same range.
const isSameExtent = (a, b) => (a[0] === b[0]) && (a[1] === b[1]);

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

    if (d0 && d1) {
      // Pick closer of the two.
      return (currX - readX(d0)) > (readX(d1) - currX) ? d1 : d0;      
    }
  }
}

// Display y value for x coord. Returns a string.
const displayYValueFromX = (data, currX, readX, readY, unit) => {
  const d = findDataPointFromX(data, currX, readX);
  if (d) {
    const yv = round2x(readY(d));
    return yv + unit + '';
  }
  else {
    return '-';
  }
}

const formatTime = d3.timeFormat('%I:%M %p');
const formatDay = d3.timeFormat("%A %b %e, %Y");

const px = n => n + 'px';
const translateXY = (x, y) => 'translateX(' + x + 'px) translateY(' + y + 'px)';

// Helpers for reading out data to series

const readSeriesFromData = data => {
  // Create series index
  // Create stubs for each of the groups in the series.
  const stubs = SERIES.map(readGroupFromConfig);
  const index = Ordered.indexWith(stubs, getVariable);
  const populated = data.reduce(stepSeriesIndex, index);
  const variables = SERIES.map(getVariable);
  return Ordered.listByKeys(populated, variables);
}

const getVariable = x => x.variable;

const stepSeriesIndex = (index, dataPoint) => {
  const variable = getVariable(dataPoint);
  if (index[variable] && dataPoint.is_desired) {
    index[variable].desired.push(dataPoint);
  }
  else if (index[variable] && !dataPoint.is_desired) {
    index[variable].measured.push(dataPoint);
  }
  return index;
};

const readGroupFromConfig = (proto) => {
  const group = Object.create(proto);
  group.desired = [];
  group.measured = [];
  return group;
};

// Calculate the mouse client position relative to a given element.
const calcRelativeMousePos = (node, clientX, clientY) => {
  const rect = node.getBoundingClientRect();
  return [(clientX - rect.left - node.clientLeft), (clientY - rect.top - node.clientTop)];
}