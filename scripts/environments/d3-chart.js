/* This module handles the creation and update code for our D3 chart.
Virtual DOM Widget wrapper code for this library is handled in chart.js */

import * as d3 from 'd3';
import {compose} from '../lang/functional';

export const S_MS = 1000;
export const MIN_MS = S_MS * 60;
export const HR_MS = MIN_MS * 60;
export const DAY_MS = HR_MS * 24;

const SCRUBBER_HEIGHT = 40;
const TOOLTIP_SPACE = 30;
const RATIO_DOMAIN = [0, 1.0];

const isNumber = x => (typeof x === 'number');

const px = n => n + 'px';
const translateXY = (x, y) => 'translateX(' + x + 'px) translateY(' + y + 'px)';

const readX = d => d.x * 1000;
const readY = d => d.y;

const getGroupColor = group => group.color;
const getGroupTitle = group => group.title;
const getGroupMeasured = group => group.measured;
const getGroupDesired = group => group.desired;

// Round to 2 decimal places.
const round2x = float =>
  Math.round(float * 100) / 100;

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

const clamp = (v, min, max) => Math.max(Math.min(v, max), min);

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

export const enter = (container, config) => {
  const {width, height, interval, tooltipWidth, tooltipHeight, readX, readY} = config;
  const series = container.datum();

  const extent = extentOverSeries(series, readX);

  const plotWidth = calcPlotWidth(extent, interval, width);
  const plotHeight = calcPlotHeight(height, tooltipHeight);

  const tickTop = calcXhairTickTop(height, tooltipHeight);

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

  const xhair = container.append('div')
    .classed('chart-xhair', true);

  const tick = container.append('div')
    .style('transform', translateXY(0, tickTop))
    .classed('chart-xhair--tick', true);

  const tooltip = container.append('div')
    .classed('chart-tooltip', true)
    .style('width', px(tooltipWidth))
    .style('height', px(tooltipHeight));

  const timestamp = tooltip.append('div')
    .classed('chart-timestamp', true);

  const time = timestamp.append('div')
    .classed('chart-timestamp--time', true);

  const day = timestamp.append('div')
    .classed('chart-timestamp--day', true);

  const readouts = tooltip.append('div')
    .classed('chart-readouts', true);

  const scrubber = container.append('div')
    .classed('chart-scrubber', true);

  const progress = scrubber.append('div')
    .classed('chart-progress', true);

  const handle = scrubber.append('div')
    .classed('chart-handle', true);

  handle.append('div')
    .classed('chart-handle--cap', true);

  handle.append('div')
    .classed('chart-handle--line', true);

  const svg = container.append('svg')
    .classed('chart-svg', true);

  const xAxis = svg.append('g')
    .classed('chart-time-axis', true)
    .call(
      d3.axisBottom(x)
      .ticks(d3.timeHour)
      .tickFormat(d3.timeFormat("%I:%M %p %A, %b %e"))
      .tickPadding(0)
    );

  container.selectAll('.tick line')
    .attr('y2', height);

  container.selectAll('.tick text')
    .attr('text-anchor', 'start')
    .attr('transform', 'translate(8)');

  // Define drag behavior
  const handleDrag = d3.drag()
    .on('start', function () {
      d3.select(this).classed('chart-handle--dragging', true);
    })
    .on('drag', function () {
      const [x, y] = d3.mouse(container.node());
      const scrubberAt = scrubberRatioToScrubberX.invert(x);
      config.scrubberAt = scrubberAt;
      container.call(update, config);
    })
    .on('end', function () {
      d3.select(this).classed('chart-handle--dragging', false);
    });

  // Attach drag behavior
  handle.call(handleDrag);

  scrubber
    .on('click', function () {
      const [x, y] = d3.mouse(container.node());
      const scrubberAt = scrubberRatioToScrubberX.invert(x);
      config.scrubberAt = scrubberAt;
      container.call(update, config);
    });

  container
    .classed('chart', true)
    .on('mousemove', function () {
      // Adapted from http://bl.ocks.org/mbostock/3902569 (GPL)
      const [mouseX, mouseY] = d3.mouse(this);
      const xhairAt = xhairRatioToXhairX.invert(mouseX);
      config.xhairAt = xhairAt;
      container.call(update, config);
    });

  return container;
}

// Renders the chart
export const update = (container, config) => {
  const {width, height, interval, tooltipWidth, tooltipHeight, scrubberAt, xhairAt, readX, readY} = config;

  const series = container.datum();

  const extent = extentOverSeries(series, readX);
  const x = calcTimeScale(extent, interval, width);

  // There are 3 kinds of width/height used in this chart:
  //
  // - width/height: the overall outer dimensions of the chart
  // - plotWidth, plotHeight: the dimensions of the plotted lines. This makes
  //   some room for the tooltip. It's also wider than the dimensions of the
  //   chart.
  // - svgWidth, svgHeight: the dimensions of the svg element.
  const plotHeight = calcPlotHeight(height, tooltipHeight);
  const plotWidth = calcPlotWidth(extent, interval, width);
  const svgHeight = calcSvgHeight(height);
  const tickTop = calcXhairTickTop(height, tooltipHeight);

  const scrubberRatioToScrubberX = d3.scaleLinear()
    .domain(RATIO_DOMAIN)
    .range([0, width - 12])
    .clamp(true);

  const scrubberRatioToPlotX = d3.scaleLinear()
    .domain(RATIO_DOMAIN)
    // Translate up to the point that the right side of the plot is adjacent
    // to the right side of the viewport.
    .range([0, plotWidth - width])
    .clamp(true);

  const xhairRatioToXhairX = d3.scaleLinear()
    .domain(RATIO_DOMAIN)
    .range([0, width])
    .clamp(true);

  const plotX = scrubberRatioToPlotX(scrubberAt);

  container
    .style('width', px(width))
    .style('height', px(height));

  const svg = container.selectAll('svg')
    .attr('width', plotWidth)
    .attr('height', svgHeight)
    // Adjust position to scrubber position
    .style('transform', translateXY(-1 * plotX, 0));

  const group = svg.selectAll('.chart-group')
    .data(series);

  group.exit()
    .remove();

  const groupEnter = group.enter()
    .append('g')
      .classed('chart-group', true);

  groupEnter
    .append('path')
      .classed('chart-measured', true)
      .style('stroke', group => group.color);

  groupEnter
    .append('path')
      .classed('chart-desired', true)
      .style('stroke', group => group.color);

  const groupAll = group.merge(groupEnter);

  groupAll.select('.chart-desired')
    .attr('d', group => {
      const desired = getGroupDesired(group);
      const measured = getGroupMeasured(group);

      const domain = isNumber(group.min) && isNumber(group.max) ?
        [group.min, group.max] : d3.extent(measured, readY);

      const y = d3.scaleLinear()
        .range([plotHeight, 0])
        .domain(domain);

      const line = d3.line()
        .x(compose(x, readX))
        .y(compose(y, readY));

      return line(desired);
    });

  groupAll.select('.chart-measured')
    .attr('d', group => {
      const measured = getGroupMeasured(group);

      const domain = isNumber(group.min) && isNumber(group.max) ?
        [group.min, group.max] : d3.extent(measured, readY);

      const y = d3.scaleLinear()
        .range([plotHeight, 0])
        .domain(domain);

      const line = d3.line()
        .x(compose(x, readX))
        .y(compose(y, readY));

      return line(measured);
    });

  groupAll
    .each(function (group) {
      const measured = getGroupMeasured(group);

      const chartDot = d3.select(this).selectAll('.chart-dot')
        .data(measured);

      const chartDotExit = chartDot.exit()
        .remove();

      const chartDotEnter = chartDot.enter()
        .append('circle')
        .attr('class', 'chart-dot')
        .attr("r", 3)
        .style('fill', group.color);

      const domain = isNumber(group.min) && isNumber(group.max) ?
        [group.min, group.max] : d3.extent(measured, readY);

      const y = d3.scaleLinear()
        .range([plotHeight, 0])
        .domain(domain);

      const chartDotAll = chartDot.merge(chartDotEnter)
        .attr('cx', compose(x, readX))
        .attr('cy', compose(y, readY));
    });

  // Position elements based on scrubber state
  const scrubberX = scrubberRatioToScrubberX(scrubberAt);

  const handle = d3.select('.chart-handle')
    .style('transform', translateXY(scrubberX, 0));

  const progress = d3.select('.chart-progress')
    .style('width', px(scrubberX));

  // Position tooltip based on tooltip state
  // Adapted from http://bl.ocks.org/mbostock/3902569 (GPL)
  const xhairX = xhairRatioToXhairX(xhairAt);
  const tx = calcTooltipX(xhairX, width, tooltipWidth);

  const xhair = d3.select('.chart-xhair')
    .style('transform', translateXY(xhairX, 0));

  const tick = d3.select('.chart-xhair--tick')
    .style('transform', translateXY(xhairX, tickTop));

  const tooltip = d3.select('.chart-tooltip');

  tooltip.style('transform', translateXY(tx, 0));

  // Calculate xhair absolute position by adding crosshair position in viewport
  // to plot offset.
  const x0 = x.invert(plotX + xhairX);

  tooltip.selectAll('.chart-timestamp--day')
    .text(formatDay(x0));

  tooltip.selectAll('.chart-timestamp--time')
    .text(formatTime(x0));

  const readout = d3.select('.chart-readouts').selectAll('.chart-readout')
    .data(series);

  const readoutEnter = readout.enter()
    .append('div')
    .classed('chart-readout', true);  

  readoutEnter.append('div')
    .classed('chart-readout--legend', true)
    .style('background-color', getGroupColor);

  readoutEnter.append('div')
    .classed('chart-readout--title', true);

  readoutEnter.append('div')
    .classed('chart-readout--measured', true)
    .style('color', getGroupColor);

  readoutEnter.append('div')
    .classed('chart-readout--target', true)
    .text(config.langTarget || 'Target');

  readoutEnter.append('div')
    .classed('chart-readout--desired', true)
    .style('color', getGroupColor);

  const readoutAll = readout.merge(readoutEnter);

  readoutAll.select('.chart-readout--title')
    .text(getGroupTitle);

  readoutAll.select('.chart-readout--measured')
    .text(function (group) {
      const data = getGroupMeasured(group);
      const unit = group.unit;
      const d = findDataPointFromX(data, x0, readX);
      if (d) {
        const yv = round2x(readY(d));
        return yv + unit;        
      }
      else {
        return '-';
      }
    });

  readoutAll.select('.chart-readout--desired')
    .text(function (group) {
      const data = getGroupDesired(group);
      const unit = group.unit;
      const d = findDataPointFromX(data, x0, readX);
      if (d) {
        const yv = round2x(readY(d));
        return yv + unit;        
      }
      else {
        return '-';
      }
    });

  return container;
}