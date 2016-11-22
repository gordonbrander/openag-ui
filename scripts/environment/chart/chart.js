import {extent, max, min} from 'd3-array';
import {scaleLinear, scaleTime} from 'd3-scale';
import {line} from 'd3-shape';
import {timeHour} from 'd3-time';
import {timeFormat} from 'd3-time-format';
import {html, Effects, Task} from 'reflex';
import {chart as CHART} from '../../../openag-config.json';
import {localize} from '../../common/lang';
import {mapOr} from '../../common/maybe';
import {tag, annotate} from '../../common/prelude';
import {cursor} from '../../common/cursor';
import * as Draggable from '../../common/draggable';
import {classed} from '../../common/attr';
import * as Unknown from '../../common/unknown';
import {listByKeys, indexWith} from '../../common/indexed';
import {compose} from '../../lang/functional';
import {clamp, isNumber} from '../../lang/math';
import {onWindow} from '../../driver/virtual-dom';
import {findRecipeStart, findRecipeEnd} from '../doc';
import * as Series from './timeseries';
import * as Point from './point';
import * as Doc from '../doc';

// Tick chart every 5s
const CHART_TICK_MS = 5000;

// The number of pixels to show on the chart per ms.
// We show the equivalent of 12px per minute.
const PX_PER_MS = (12 / (60 * 1000));

const SIDEBAR_WIDTH = 256;
const HEADER_HEIGHT = 72;
const SCRUBBER_HEIGHT = 40;
const TOOLTIP_SPACE = 30;
const READOUT_HEIGHT = 18;
const TOOLTIP_PADDING = 20;
const RATIO_DOMAIN = [0, 1.0];

// Max number of datapoints per line buffer.
const SERIES_LIMIT = 500;

// Actions

export const Resize = (width, height) => ({
  type: 'Resize',
  width,
  height
});

// Tick the chart (advance all lines up to now)
export const Tick = {type: 'Tick'};
const AlwaysTick = () => Tick;

export const DropMarker = {type: 'DropMarker'};

export const MoveXhair = tag('MoveXhair');
export const SetData = tag('SetData');
export const AddData = tag('AddData');

const ScrubberAction = tag('Scrubber');
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
    xhairAt
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

    // Width of the tooltip that shows the readouts.
    this.tooltipWidth = 424;
  }
}

Model.isEmpty = model => {
  const tally = Series.calcLength(model.series);
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
  model.xhairAt
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
  xhairAt
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
  model.xhairAt
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
  model.xhairAt
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
  model.xhairAt
);

export const init = () => {
  const width = calcChartWidth(window.innerWidth);
  const height = calcChartHeight(window.innerHeight);

  const [scrubber, scrubberFx] = Draggable.init(false, [width, height]);
  const series = Series.fromConfigs(CHART);

  const model = new Model(
    series,
    [],
    null,
    null,
    width,
    height,
    scrubber,
    0.5,
    true
  );

  const TickEffect = Effects.perform(Task.sleep(CHART_TICK_MS)).map(AlwaysTick);

  return [
    model,
    Effects.batch([
      TickEffect,
      scrubberFx.map(ScrubberAction)
    ])
  ];
}

export const update = (model, action) =>
  action.type === 'Tick' ?
  updateTick(model) :
  action.type === 'Scrubber' ?
  updateScrub(model, action.source) :
  action.type === 'MoveXhair' ?
  [Model.changeXhair(model, action.source), Effects.none] :
  action.type === 'AddData' ?
  addData(model, action.source) :
  action.type === 'Resize' ?
  updateSize(model, action.width, action.height) :
  action.type === 'DropMarker' ?
  dropMarker(model) :
  Unknown.update(model, action);

const addData = (model, docs) => {
  const recipeStart = mapOr(findRecipeStart(docs), Doc.xMs, model.recipeStart);
  const recipeEnd = mapOr(findRecipeEnd(docs), Doc.xMs, model.recipeEnd);
  const revA = model.series.rev;
  const series = Series.advanceSeries(model.series, docs, Date.now(), SERIES_LIMIT);
  const revB = series.rev;

  // If anything has changed, we should return a new model.
  const shouldUpdate = (
    recipeStart !== model.recipeStart ||
    recipeEnd !== model.recipeEnd ||
    revA !== revB
  );

  if (shouldUpdate) {
    const next = new Model(
      series,
      model.markers,
      recipeStart,
      recipeEnd,
      model.width,
      model.height,
      model.scrubber,
      model.xhairAt
    );

    return [next, Effects.none];
  }
  else {
    return [model, Effects.none];
  }
}

const updateTick = (model) => {
  const series = model.series;
  const revA = series.rev;
  // Advance series to now
  series.tick(Date.now());
  const revB = series.rev;
  const shouldUpdate = revA !== revB;

  const effect = Effects.perform(Task.sleep(CHART_TICK_MS)).map(AlwaysTick);

  if (shouldUpdate) {
    const next = new Model(
      series,
      model.markers,
      model.recipeStart,
      model.recipeEnd,
      model.width,
      model.height,
      model.scrubber,
      model.xhairAt
    );

    return [next, effect];
  }
  else {
    return [model, effect];
  }
}

const dropMarker = model => {
  const mark = new Point.Point(Date.now(), '');

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
  // If no data to show, render empty
  Model.isEmpty(model) ?
  viewEmpty(model, address) :
  viewData(model, address);

const viewEmpty = (model, address) => {
  const {width, height} = model;
  return html.div({
    className: 'chart split-view-content',
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
  const {series, width, height, tooltipWidth,
    scrubber, xhairAt, recipeStart, recipeEnd, markers} = model;

  const lines = series.lines;

  // Read out series class into array.
  const extentX = [series.min, series.max];

  const scrubberMaxX = width - 12;
  const scrubberX = clamp(scrubber.coords[0], 0, scrubberMaxX);
  const isDragging = scrubber.isDragging;

  // Calculate dimensions
  // We need to have one row per group of 2 lines
  const nTooltipRow = Math.floor(lines.length / 2);
  const tooltipHeight = (nTooltipRow * READOUT_HEIGHT) + (TOOLTIP_PADDING * 2);
  const plotWidth = calcPlotWidth(extentX);
  const plotHeight = calcPlotHeight(height, tooltipHeight);
  const svgHeight = calcSvgHeight(height);
  const tickTop = calcXhairTickTop(height, tooltipHeight);

  // Calculate scales
  const x = scaleTime()
    .domain(extentX)
    .range([0, plotWidth]);

  const xhairRatioToXhairX = scaleLinear()
    .domain(RATIO_DOMAIN)
    .range([0, width])
    .clamp(true);

  const scrubberToPlotX = scaleLinear()
    .domain([0, scrubberMaxX])
    // Translate up to the point that the right side of the plot is adjacent
    // to the right side of the viewport.
    .range([0, plotWidth - width])
    .clamp(true);

  const plotX = scrubberToPlotX(scrubberX);

  const xhairX = xhairRatioToXhairX(xhairAt);
  const tooltipX = calcTooltipX(xhairX, width, tooltipWidth);

  // Calculate xhair absolute position by adding crosshair position in viewport
  // to plot offset. Then use absolute coord in chart viewport to get inverse
  // value (time) under xhair.
  const xhairTime = x.invert(plotX + xhairX);

  const children = lines.map(line => viewLine(line, address, x, plotHeight));

  const axis = renderAxis(x, svgHeight);
  children.push(axis);

  const userMarkers = renderUserMarkers(markers, x, svgHeight);
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

  //const readouts = lines.map(group => renderReadout(group, xhairTime));
  const readouts = [];

  return html.div({
    className: 'chart split-view-content',
    onMouseMove: event => {
      const [mouseX, mouseY] = calcRelativeMousePos(
        event.currentTarget,
        event.clientX, event.clientY
      );

      const xhairAt = xhairRatioToXhairX.invert(mouseX);
      address(MoveXhair(xhairAt));
    },
    onTouchStart: event => {
      // Prevent from becoming a click event.
      event.preventDefault();
    },
    onTouchMove: event => {
      event.preventDefault();
      const changedTouches = event.changedTouches;
      if (changedTouches.length) {
        // @TODO it might be better to find the common midpoint between multiple
        // touches if touches > 1.
        const touch = changedTouches.item(0);
        const coords = calcRelativeMousePos(
          event.currentTarget,
          touch.clientX,
          touch.clientY
        );
        const xhairAt = xhairRatioToXhairX.invert(coords[0]);
        address(MoveXhair(xhairAt));
      }
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
        }, [
          // Convert seconds to ms for formatTime
          formatTime(xhairTime)
        ]),
        html.div({
          className: 'chart-timestamp--day'
        }, [
          // Convert seconds to ms for formatTime
          formatDay(xhairTime)
        ]),
      ]),
      html.div({
        className: 'chart-readouts'
      }, readouts)
    ]),
    html.div({
      className: classed({
        'chart-scrubber': true,
        'chart-scrubber--active': isDragging
      }),
      onMouseDown: onScrubberMouseDown(address),
      onMouseMove: onScrubberMouseMove(address),
      onMouseUp: onScrubberMouseUp(address),
      onTouchStart: onScrubberTouchStart(address),
      onTouchMove: onScrubberTouchMove(address),
      onTouchEnd: onScrubberTouchEnd(address)
    }, [
      html.div({
        className: 'chart-scrubber--backing'
      }),
      html.div({
        className: 'chart-progress',
        style: {
          width: px(scrubberX)
        }
      }),
      html.div({
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

const viewLine = (model, address, x, plotHeight) => {
  const {color, min, max, points} = model;

  const domain = isNumber(min) && isNumber(max) ?
    [min, max] : extent(points, Point.y);

  const y = scaleLinear()
    .range([plotHeight, 0])
    .domain(domain);

  const calcLine = line()
    .x(compose(x, Point.x))
    .y(compose(y, Point.y));

  return svgPath({
    d: calcLine(points),
    className: (model.is_desired ? 'chart-desired' : 'chart-measured'),
    style: {
      stroke: color
    }
  });
}

const renderReadout = (group, xhairTime) => {
  const unit = group.unit;
  const color = group.color;
  const measured = DownsampleBuffer.values(group.measured);
  const desired = DownsampleBuffer.values(group.desired);
  const measuredText = Point.displayYForX(measured, xhairTime, unit);
  const desiredText = Point.displayYForX(desired, xhairTime, unit);

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

const renderUserMarkers = (markers, scale, height) =>
  svgG({
    className: 'chart-user-markers'
  }, markers.map(marker => {
    const timestamp = Point.x(marker);
    const x = scale(timestamp);
    const text = formatTick(timestamp);
    return renderUserMarker(x, height, text);
  }));

// Event ports

const onScrubberMouseDown = annotate(Draggable.onMouseDown, ScrubberAction);
const onScrubberMouseUp = annotate(Draggable.onMouseUp, ScrubberAction);
const onScrubberMouseMove = annotate(Draggable.onMouseMove, ScrubberAction);
const onScrubberTouchStart = annotate(Draggable.onTouchStart, ScrubberAction);
const onScrubberTouchMove = annotate(Draggable.onTouchMove, ScrubberAction);
const onScrubberTouchEnd = annotate(Draggable.onTouchEnd, ScrubberAction);

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

const calcChartWidth = (width) =>
  width - SIDEBAR_WIDTH;

const calcChartHeight = (height) =>
  height - HEADER_HEIGHT;

const calcPlotWidth = (extent) => {
  const duration = extent[1] - extent[0];
  const plotWidth = duration * PX_PER_MS;
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