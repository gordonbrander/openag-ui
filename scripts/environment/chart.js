import {extent, max, min, bisector} from 'd3-array';
import {scaleLinear, scaleTime} from 'd3-scale';
import {line} from 'd3-shape';
import {timeHour} from 'd3-time';
import {timeFormat} from 'd3-time-format';
import {html, forward, Effects, thunk} from 'reflex';
import * as Config from '../../openag-config.json';
import {localize} from '../common/lang';
import {mapOr} from '../common/maybe';
import {merge, tag} from '../common/prelude';
import {cursor} from '../common/cursor';
import * as Draggable from '../common/draggable';
import {classed} from '../common/attr';
import * as Unknown from '../common/unknown';
import {listByKeys, indexWith} from '../common/indexed';
import {compose} from '../lang/functional';
import {find} from '../lang/find';
import {onWindow} from '../driver/virtual-dom';
import {marker} from '../environment/datapoints';

const CHART_CONFIG = Config.chart;

const S_MS = 1000;
const MIN_MS = S_MS * 60;
const HR_MS = MIN_MS * 60;
const DAY_MS = HR_MS * 24;

const SIDEBAR_WIDTH = 256;
const HEADER_HEIGHT = 72;
const SCRUBBER_HEIGHT = 40;
const TOOLTIP_SPACE = 30;
const READOUT_HEIGHT = 18;
const TOOLTIP_PADDING = 20;
const RATIO_DOMAIN = [0, 1.0];

const RECIPE_START = 'recipe_start';
const RECIPE_END = 'recipe_end';

const MAX_DATAPOINTS = 5000;

// Actions

export const Resize = (width, height) => ({
  type: 'Resize',
  width,
  height
});

export const DropMarker = {type: 'DropMarker'};

export const MoveXhair = tag('MoveXhair');
export const SetData = tag('SetData');
export const AddData = tag('AddData');

// Put chart into "loading" mode. Note that chart is dumb about whether it is
// loading or simply lacking data. You have to tell it via actions. Giving the
// chart data via the Data action will also automatically flip `isLoading` to
// false.
export const Loading = tag('Loading');
// Put chart into "not loading" mode.
export const Ready = tag('Ready');

const ScrubberAction = tag('Scrubber');
const MoveScrubber = compose(ScrubberAction, Draggable.Move);
const HoldScrubber = ScrubberAction(Draggable.Hold);
const ReleaseScrubber = ScrubberAction(Draggable.Release);

// Init and update functions

export const Model = (
  variables,
  config,
  recipeStart,
  recipeEnd,
  width,
  height,
  scrubberAt,
  xhairAt,
  isLoading
) => ({
  variables,
  config,

  recipeStart,
  recipeEnd,

  // Time interval to show within chart viewport (visible area)
  interval: HR_MS,

  // Define dimensions
  width,
  height,
  tooltipWidth: 424,

  // Define chart state
  scrubber: Draggable.Model(false, scrubberAt),
  xhairAt,
  isLoading
});

// Construct a group from a config object
const readGroupFromConfig = ({
  variable,
  title,
  unit,
  min,
  max,
  color
}) => ({
  measured: [],
  desired: [],
  variable,
  title,
  unit,
  min,
  max,
  color
});


// Construct a tree structure from model (useful for view)
//
// Output:
//
//     [
//       {
//         variable: 'air_temperature',
//         measured: [dataPoint, dataPoint, ...],
//         desired: [dataPoint, dataPoint, ...],
//         title: "Temperature",
//         unit: "\u00B0",
//         min: 7.2,
//         max: 48.8,
//         color: '#ff8300'
//       },
//       ...
//     ]
const readSeries = (model) => {
  const {variables, config} = model;
  const groupList = config.map(readGroupFromConfig);
  const groupIndex = indexWith(groupList, getVariable);
  const populated = variables.reduce(insertDataPoint, groupIndex);
  const variableKeys = config.map(getVariable);
  return listByKeys(populated, variableKeys);
}

// Insert datapoint in index, mutating model. We use this function to build
// up the variable groups index.
// Returns mutated index.
const insertDataPoint = (index, dataPoint) => {
  const variable = getVariable(dataPoint);
  const group = index[variable];
  const type = dataPoint.is_desired ? 'desired' : 'measured';

  // Check that this is a known variable in our configuration
  // File datapoint away in measured or desired, making sure that it is
  // monotonic (that a new datapoint comes after any older datapoints).
  if (index[variable]) {
    index[variable][type].push(dataPoint);
  }

  return index;
}

export const init = () => [
  Model(
    [],
    CHART_CONFIG,
    null,
    null,
    calcChartWidth(window.innerWidth),
    calcChartHeight(window.innerHeight),
    1.0,
    0.5,
    true
  ),
  Effects.none
];

export const update = (model, action) =>
  action.type === 'Scrubber' ?
  updateScrub(model, action.source) :
  action.type === 'MoveXhair' ?
  [merge(model, {xhairAt: action.source}), Effects.none] :
  action.type === 'AddData' ?
  addData(model, action.source) :
  action.type === 'Resize' ?
  updateSize(model, action.width, action.height) :
  action.type === 'Loading' ?
  [merge(model, {isLoading: true}), Effects.none] :
  action.type === 'Ready' ?
  [merge(model, {isLoading: false}), Effects.none] :
  action.type === 'DropMarker' ?
  dropMarker(model) :
  Unknown.update(model, action);

const addData = (model, data) => {
  const variables = concatSortedBuffer(model.variables, data, MAX_DATAPOINTS, readX);

  // If variables model actually updated, then create new chart model.
  if (model.variables !== variables) {
    const recipeStart = mapOr(find(variables, isRecipeStart), readRecipeTimeValue, model.recipeStart);
    const recipeEnd = mapOr(find(variables, isRecipeEnd), readRecipeTimeValue, model.recipeEnd);

    const next = merge(model, {
      // Create new variables model for data.
      variables,
      isLoading: false,
      recipeStart,
      recipeEnd
    });

    return [next, Effects.none];
  }
  else {
    return [model, Effects.none];
  }
}

const dropMarker = model => {
  const nowInSeconds = Date.now() / 1000;
  const mark = marker(nowInSeconds, '');
  const variables = insertSortedBuffer(model.variables, mark, MAX_DATAPOINTS, readX);

  return [
    merge(model, {variables}),
    Effects.none
  ];
}

const updateSize = (model, width, height) => [
  merge(model, {
    width,
    height
  }),
  Effects.none
];

const updateScrub = cursor({
  get: model => model.scrubber,
  set: (model, scrubber) => merge(model, {scrubber}),
  update: Draggable.update,
  tag: ScrubberAction
});

// View function
export const view = (model, address) =>
  // If model is loading, show loading view
  model.isLoading ?
  viewLoading(model, address) :
  // If not loading and no data to show, render empty
  model.variables.length === 0 ?
  viewEmpty(model, address) :
  viewData(model, address);

// Handle the case where there is no data yet.
const viewLoading = (model, address) => {
  const {width, height} = model;
  return html.div({
    className: 'chart',
    style: {
      width: px(width),
      height: px(height)
    },
    onResize: onWindow(address, () => {
      return Resize(
        calcChartWidth(window.innerWidth),
        calcChartHeight(window.innerHeight)
      );
    })
  }, [
    html.img({
      className: 'chart-loading--img',
      src: 'assets/loading.svg',
      width: '80',
      height: '80'
    })
  ]);
}

const viewEmpty = (model, address) => {
  const {width, height} = model;
  return html.div({
    className: 'chart',
    style: {
      width: px(width),
      height: px(height)
    },
    onResize: onWindow(address, () => {
      return Resize(
        calcChartWidth(window.innerWidth),
        calcChartHeight(window.innerHeight)
      );
    })
  }, [
    html.div({
      className: 'chart-empty'
    }, [
      html.div({
        className: 'chart-empty--message'
      }, [
        localize('No data yet. Maybe try starting a new recipe?')
      ])
    ])
  ]);
}

const viewData = (model, address) => {
  const {variables, interval, width, height, tooltipWidth,
    scrubber, xhairAt, recipeStart, recipeEnd} = model;

  const extentX = extent(variables, readX);
  const series = readSeries(model);

  const scrubberAt = scrubber.coords;
  const isDragging = scrubber.isDragging;

  // Calculate dimensions
  const tooltipHeight = (series.length * READOUT_HEIGHT) + (TOOLTIP_PADDING * 2);
  const plotWidth = calcPlotWidth(extentX, interval, width);
  const plotHeight = calcPlotHeight(height, tooltipHeight);
  const svgHeight = calcSvgHeight(height);
  const tickTop = calcXhairTickTop(height, tooltipHeight);

  // Calculate scales
  const x = calcTimeScale(extentX, interval, width);

  const scrubberRatioToScrubberX = scaleLinear()
    .domain(RATIO_DOMAIN)
    .range([0, width - 12])
    .clamp(true);

  const scrubberX = scrubberRatioToScrubberX(scrubberAt);

  const xhairRatioToXhairX = scaleLinear()
    .domain(RATIO_DOMAIN)
    .range([0, width])
    .clamp(true);

  const scrubberRatioToPlotX = scaleLinear()
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

  const axis = renderAxis(x, svgHeight);
  children.push(axis);

  if (recipeStart) {
    const recipeStartMarker = renderMarker(
      x(recipeStart),
      svgHeight,
      localize('Recipe Started')
    );

    children.push(recipeStartMarker);
  }

  if (recipeEnd) {
    const recipeEndMarker = renderMarker(
      x(recipeEnd),
      svgHeight,
      localize('Recipe Ended')
    );
    children.push(recipeEndMarker);
  }

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
    const desired = displayYValueFromX(group.desired, xhairTime, readX, readY, group.unit);
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
    onResize: onWindow(address, () => {
      return Resize(
        calcChartWidth(window.innerWidth),
        calcChartHeight(window.innerHeight)
      );
    }),
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
        className: classed({
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
    [min, max] : extent(measured, readY);

  const y = scaleLinear()
    .range([plotHeight, 0])
    .domain(domain);

  const calcLine = line()
    .x(compose(x, readX))
    .y(compose(y, readY));

  const desiredPath = svgPath({
    d: calcLine(desired),
    className: 'chart-desired',
    style: {
      stroke: color
    }
  });

  const measuredPath = svgPath({
    d: calcLine(measured),
    className: 'chart-measured',
    style: {
      stroke: color
    }
  });

  return svgG({
    className: 'chart-group'
  }, [desiredPath, measuredPath]);
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
    }, [
      localize('Target:')
    ]),
    html.span({
      className: 'chart-readout--desired',
      style: {
        color: group.color
      }
    }, [desired])
  ]);

const renderMarker = (x, height, text) =>
  svgG({
    className: 'chart-tick',
    transform: `translate(${x}, 0)`
  }, [
    svgLine({
      className: 'chart-tick--line',
      x2: 0.5,
      y1: 0.5,
      y2: height
    }),
    svgText({
      className: 'chart-tick--text',
      x: 6.0,
      y: 16.0
    }, [
      text
    ])
  ]);

const renderAxis = (scale, height) => {
  const ticks = scale.ticks(timeHour);
  return svgG({
    className: 'chart-time-axis'
  }, ticks.map(tick => renderMarker(scale(tick), height, formatTick(tick))));
}

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
const svgPath = compose(svgNS, html.path);
const svgG = compose(svgNS, html.g);
const svgCircle = compose(svgNS, html.circle);
const svgLine = compose(svgNS, html.line);
const svgText = compose(svgNS, html.text);

const readX = d =>
  // Timestamp is in seconds. For x position, read timestamp as ms.
  Math.round(d.timestamp * 1000);

const readY = d =>
  Number.parseFloat(d.value);

const readRecipeTimeValue = d =>
  Number.parseFloat(d.value) * 1000;

const clamp = (v, min, max) => Math.max(Math.min(v, max), min);
const isNumber = x => (typeof x === 'number');

// Round to 2 decimal places.
const round2x = float => Math.round(float * 100) / 100;

// Given 2 extents, test to see whether they are the same range.
const isSameExtent = (a, b) => (a[0] === b[0]) && (a[1] === b[1]);

const calcChartWidth = (width) =>
  width - SIDEBAR_WIDTH;

const calcChartHeight = (height) =>
  height - HEADER_HEIGHT;

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
  return scaleTime()
    .domain(domain)
    .range([0, calcPlotWidth(domain, interval, width)]);
}

const calcTooltipX = (x, width, tooltipWidth) =>
  clamp(x - (tooltipWidth / 2), 0, width - (tooltipWidth));

const findDataPointFromX = (data, currX, readX) => {
  if (data.length > 0) {
    // Used for deriving y value from x position.
    const bisectDate = bisector(readX).left;
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

const formatTick = timeFormat("%I:%M %p %A, %b %e");
const formatTime = timeFormat('%I:%M %p');
const formatDay = timeFormat("%A %b %e, %Y");

const px = n => n + 'px';
const translateXY = (x, y) => 'translateX(' + x + 'px) translateY(' + y + 'px)';

// Calculate the mouse client position relative to a given element.
const calcRelativeMousePos = (node, clientX, clientY) => {
  const rect = node.getBoundingClientRect();
  return [(clientX - rect.left - node.clientLeft), (clientY - rect.top - node.clientTop)];
}

const getVariable = x => x.variable;

// Trim buffer array to limit, fro the left. Mutates and returns buffer.
const trimLeft = (buffer, limit) => {
  if (buffer.length > limit) {
    buffer.splice(0, buffer.length - limit);
  }
  return buffer;
}

const trimSorted = (buffer, limit, readX) => {
  sortDesc(buffer, readX);
  trimLeft(buffer, limit);
  return buffer;
}

const concatSortedBuffer = (buffer, items, limit, readX) => {
  // If the buffer is empty, create a new items array, sort it. This is now
  // the buffer.
  if (buffer.length === 0) {
    return sortDesc(items.slice(), readX);
  }
  // If there are no items, return the buffer unchanged.
  else if (items.length === 0) {
    return buffer;
  }
  // If the most recent new item is still not newer than the most recent buffer
  // item, don't append to buffer.
  else if (max(items, readX) <= max(buffer, readX)) {
    return buffer;
  }
  // Otherwise, add everything, then sort, then trim.
  else {
    return trimSorted(buffer.concat(items), limit, readX);
  }
}

// Insert a datapoint somewhere into a sorted buffer.
// Returns a new buffer array, sorted by readX desc.
const insertSortedBuffer = (buffer, item, limit, readX) => {
  // If the buffer is empty, create a new items array, sort it. This is now
  // the buffer.
  if (buffer.length === 0) {
    return [item];
  }
  else {
    return trimSorted(buffer.concat(item), limit, readX);
  }
}

// Sort items in descending order, in place
// Returns mutated sorted array.
const sortDesc = (array, read) =>
  array.sort(descending(read));

// Create a comparator for sorting from a read function.
// Returns a comparator function.
const descending = (read) => (a, b) => {
  const fa = read(a);
  const fb = read(b);
  return (
    fa > fb ? 1 :
    fa < fb ? -1 :
    0
  );
}

const last = array => array.length > 0 ? array[array.length - 1] : null;

const isRecipeStart = x => x.variable === RECIPE_START;
const isRecipeEnd = x => x.variable === RECIPE_END;
