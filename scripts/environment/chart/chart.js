import {extent, max, min, bisector} from 'd3-array';
import {scaleLinear, scaleTime} from 'd3-scale';
import {line} from 'd3-shape';
import {timeHour} from 'd3-time';
import {timeFormat} from 'd3-time-format';
import {html, forward, Effects, thunk} from 'reflex';
import {chart as CHART} from '../../../openag-config.json';
import {localize} from '../../common/lang';
import {mapOr} from '../../common/maybe';
import {tag} from '../../common/prelude';
import {cursor} from '../../common/cursor';
import * as Draggable from '../../common/draggable';
import {classed} from '../../common/attr';
import * as Unknown from '../../common/unknown';
import {listByKeys, indexWith} from '../../common/indexed';
import {compose} from '../../lang/functional';
import {onWindow} from '../../driver/virtual-dom';
import {marker, isMarker, findRecipeStart, findRecipeEnd, readX, readY, readVariable} from '../datapoints';
import {FixedBuffer} from './fixed-buffer';
import {LineGroup} from './line-group';
import {SeriesView} from './series';

const S_MS = 1000;
const MIN_MS = S_MS * 60;
const HR_MS = MIN_MS * 60;
const DAY_MS = HR_MS * 24;
const CHART_DURATION = DAY_MS * 5;

const SIDEBAR_WIDTH = 256;
const HEADER_HEIGHT = 72;
const SCRUBBER_HEIGHT = 40;
const TOOLTIP_SPACE = 30;
const READOUT_HEIGHT = 18;
const TOOLTIP_PADDING = 20;
const RATIO_DOMAIN = [0, 1.0];

// Max number of datapoints per line buffer.
const MAX_DATAPOINTS = 500;

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

// Chart Model
class Model {
  constructor(
    series,
    markers,
    recipeStart,
    recipeEnd,
    width,
    height,
    scrubber,
    xhairAt,
    isLoading
  ) {
    // Series class instance.
    this.series = series;
    // Markers array.
    this.markers = markers;
    // Recipe Start datapoint
    this.recipeStart = recipeStart;
    // Recipe End datapoint
    this.recipeEnd = recipeEnd;

    // Dimensions in px
    this.width = width;
    this.height = height;

    // Scrubber class instance
    this.scrubber = scrubber;

    // Crosshair ratio
    this.xhairAt = xhairAt;

    // Is chart loading? (Boolean)
    this.isLoading = isLoading;

    // Currently hard-coded instance variables.
    // Time interval to show within chart viewport (visible area)
    this.interval =  HR_MS;
    // Width of the tooltip that shows the readouts.
    this.tooltipWidth = 424;
  }
}

Model.isEmpty = model => {
  const tally = SeriesView.reduce(
    model.series,
    (state, group) => state + LineGroup.calcLength(group),
    0
  );

  return tally < 1;
}

// Swap Series class instance, returning new Model.
Model.changeSeries = (model, series) => new Model(
  series,
  model.markers,
  model.recipeStart,
  model.recipeEnd,
  model.width,
  model.height,
  model.scrubber,
  model.xhairAt,
  model.isLoading
);

// Swap xhair ratio, returning new Model.
Model.changeXhair = (model, xhairAt) => new Model(
  model.series,
  model.markers,
  model.recipeStart,
  model.recipeEnd,
  model.width,
  model.height,
  model.scrubber,
  xhairAt,
  model.isLoading
);

// Swap scrubber class instance, returning new Model.
Model.changeScrubber = (model, scrubber) => new Model(
  model.series,
  model.markers,
  model.recipeStart,
  model.recipeEnd,
  model.width,
  model.height,
  scrubber,
  model.xhairAt,
  model.isLoading
);

// Swap width and height, returning new Model.
Model.changeDimensions = (model, width, height) => new Model(
  model.series,
  model.markers,
  model.recipeStart,
  model.recipeEnd,
  width,
  height,
  model.scrubber,
  model.xhairAt,
  model.isLoading
);

// Swap loading state, returning new Model.
Model.changeLoading = (model, isLoading) => new Model(
  model.series,
  model.markers,
  model.recipeStart,
  model.recipeEnd,
  model.width,
  model.height,
  model.scrubber,
  model.xhairAt,
  isLoading
);

// Swap markers array, returning new Model.
Model.changeMarkers = (model, markers) => new Model(
  model.series,
  markers,
  model.recipeStart,
  model.recipeEnd,
  model.width,
  model.height,
  model.scrubber,
  model.xhairAt,
  model.isLoading
);

export const init = () => [
  new Model(
    SeriesView.from([], CHART, MAX_DATAPOINTS),
    [],
    null,
    null,
    calcChartWidth(window.innerWidth),
    calcChartHeight(window.innerHeight),
    Draggable.Model(false, 1.0),
    0.5,
    true
  ),
  Effects.none
];

export const update = (model, action) =>
  action.type === 'Scrubber' ?
  updateScrub(model, action.source) :
  action.type === 'MoveXhair' ?
  [Model.changeXhair(model, action.source), Effects.none] :
  action.type === 'AddData' ?
  addData(model, action.source) :
  action.type === 'Resize' ?
  updateSize(model, action.width, action.height) :
  action.type === 'Loading' ?
  [
    (
      !model.isLoading ?
      Model.changeLoading(model, true) :
      model
    ),
    Effects.none
  ] :
  action.type === 'Ready' ?
  [
    (
      model.isLoading ?
      Model.changeLoading(model, false) :
      model
    ),
    Effects.none
  ] :
  action.type === 'DropMarker' ?
  dropMarker(model) :
  Unknown.update(model, action);

const addData = (model, data) => {
    const recipeStart = mapOr(findRecipeStart(data), readX, model.recipeStart);
    const recipeEnd = mapOr(findRecipeEnd(data), readX, model.recipeEnd);

    const next = new Model(
      model.series.advanceMany(data),
      model.markers,
      recipeStart,
      recipeEnd,
      model.width,
      model.height,
      model.scrubber,
      model.xhairAt,
      false
    );

    return [next, Effects.none];
}

const dropMarker = model => {
  const mark = marker(secondsNow(), '');

  return [
    Model.changeMarkers(model, model.markers.concat(mark)),
    Effects.none
  ];
}

const updateSize = (model, width, height) => [
  Model.changeDimensions(model, width, height),
  Effects.none
];

const updateScrub = cursor({
  get: model => model.scrubber,
  set: (model, scrubber) => Model.changeScrubber(model, scrubber),
  update: Draggable.update,
  tag: ScrubberAction
});

// View function
export const view = (model, address) =>
  // If model is loading, show loading view
  model.isLoading ?
  viewLoading(model, address) :
  // If not loading and no data to show, render empty
  Model.isEmpty(model) ?
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
  const {series, interval, width, height, tooltipWidth,
    scrubber, xhairAt, recipeStart, recipeEnd, markers} = model;

  // Read out series class into array.
  const groups = SeriesView.groups(series);
  const now = Date.now();
  const extentX = [now - CHART_DURATION, now];

  const scrubberAt = scrubber.coords;
  const isDragging = scrubber.isDragging;

  // Calculate dimensions
  const tooltipHeight = (groups.length * READOUT_HEIGHT) + (TOOLTIP_PADDING * 2);
  const plotWidth = calcPlotWidth(extentX, interval, width);
  const plotHeight = calcPlotHeight(height, tooltipHeight);
  const svgHeight = calcSvgHeight(height);
  const tickTop = calcXhairTickTop(height, tooltipHeight);

  // Calculate scales
  const x = scaleTime()
    .domain(extentX)
    .range([0, plotWidth]);

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

  const children = groups.map(group => viewGroup(group, address, x, plotHeight));

  const axis = renderAxis(x, svgHeight);
  children.push(axis);

  const userMarkers = renderUserMarkers(markers, x, svgHeight, readX);
  children.push(userMarkers);

  if (recipeStart) {
    const recipeStartMarker = renderAxisMarker(
      x(recipeStart),
      svgHeight,
      localize('Recipe Started')
    );

    children.push(recipeStartMarker);
  }

  if (recipeEnd) {
    const recipeEndMarker = renderAxisMarker(
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

  const readouts = groups.map(group => renderReadout(group, xhairTime));

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
    d: calcLine(FixedBuffer.values(desired)),
    className: 'chart-desired',
    style: {
      stroke: color
    }
  });

  const measuredPath = svgPath({
    d: calcLine(FixedBuffer.values(measured)),
    className: 'chart-measured',
    style: {
      stroke: color
    }
  });

  return svgG({
    className: 'chart-group'
  }, [desiredPath, measuredPath]);
}

const renderReadout = (group, xhairTime) => {
  const unit = group.unit;
  const color = group.color;
  const measured = FixedBuffer.values(group.measured);
  const desired = FixedBuffer.values(group.desired);
  const measuredText = displayYValueFromX(measured, xhairTime, readX, readY, unit);
  const desiredText = displayYValueFromX(desired, xhairTime, readX, readY, unit);

  return html.div({
    className: 'chart-readout'
  }, [
    html.div({
      className: 'chart-readout--legend',
      style: {
        backgroundColor: color
      }
    }),
    html.span({
      className: 'chart-readout--title',
    }, [group.title]),
    html.span({
      className: 'chart-readout--measured',
      style: {
        color: color
      }
    }, [measuredText]),
    html.span({
      className: 'chart-readout--target',
    }, [
      localize('Target:')
    ]),
    html.span({
      className: 'chart-readout--desired',
      style: {
        color: color
      }
    }, [desiredText])
  ]);
}

const renderAxisMarker = (x, height, text) =>
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

const renderUserMarker = (x, height, text) =>
  svgG({
    className: 'chart-tick chart-tick--user',
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
  }, ticks.map(tick => renderAxisMarker(scale(tick), height, formatTick(tick))));
}

const renderUserMarkers = (markers, scale, height, readX) =>
  svgG({
    className: 'chart-user-markers'
  }, markers.map(marker => {
    const timestamp = readX(marker);
    const x = scale(timestamp);
    const text = formatTick(timestamp);
    return renderUserMarker(x, height, text);
  }));

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

// Read Date.now() in seconds.
const secondsNow = () => Date.now() / 1000;
