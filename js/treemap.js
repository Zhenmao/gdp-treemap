import tooltip from "./tooltip.js";

export default function treemap({ el, data, color, fontSettings }) {
  let width,
    height,
    selectedDataParent,
    selectedData = data;

  const aspectRadio = 16 / 9;
  const minArea = 240000;
  const paddingInner = 1;
  const paddingOuter = 2;
  const paddingTop = 16;
  const parentLabelPadding = 4;
  const parentLabelFontSize = fontSettings.fontSizes.find(
    (d) => d <= paddingTop
  );

  const treemap = d3
    .treemap()
    .paddingInner((d) => (d.data.level > 0 ? paddingInner : 0))
    .paddingOuter((d) => (d.data.level > 0 ? paddingOuter : 0))
    .paddingTop((d) => (d.data.level > 0 ? paddingTop : 0));

  const formatValue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    minimumSignificantDigits: 3,
    maximumSignificantDigits: 3,
  }).format;
  const formatChange = (d) =>
    new Intl.NumberFormat("en-US", {
      style: "unit",
      unit: "percent",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(d * 100);

  const container = d3.select(el).classed("treemap", true);
  const svg = container.append("svg");
  svg
    .append("defs")
    .append("filter")
    .attr("id", "treemapLabelShadow")
    .call((filter) =>
      filter
        .append("feDropShadow")
        .attr("dx", 0)
        .attr("dy", 1)
        .attr("stdDeviation", 0)
        .attr("flood-opacity", 0.5)
    );
  const nodesG = svg.append("g").attr("class", "nodes");
  let nodeG = nodesG.selectChildren();

  const tip = tooltip({ el });

  new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      resized(entry.contentRect);
    });
  }).observe(el);

  function resized(contentRect) {
    width = contentRect.width;
    height =
      (width * width) / aspectRadio > minArea
        ? Math.round(width / aspectRadio)
        : Math.round(minArea / width);

    treemap.size([width, height]);

    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    render();
  }

  function render() {
    const root = d3
      .hierarchy(selectedData)
      .sum((d) => d.value)
      .sort((a, b) => b.value - a.value);
    treemap(root);

    nodeG = nodeG
      .data(
        root.descendants().filter((d) => d.data.level > 0),
        (d) => d.data.code
      )
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "node")
          .call((g) =>
            g
              .append("rect")
              .attr("class", "node__rect")
              .attr("fill", (d) =>
                d.data.change === undefined
                  ? "transparent"
                  : color(d.data.change)
              )
          )
          .call((g) => g.append("g").attr("class", "node__labels"))
          .call((g) =>
            g
              .filter((d) => d.height === 0)
              .on("pointerenter", entered)
              .on("pointermove", moved)
              .on("pointerleave", left)
          )
      )
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

    nodeG
      .select(".node__rect")
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0);

    const leafLabels = nodeG
      .select(".node__labels")
      .filter((d) => d.height === 0);

    leafLabels
      .selectChildren()
      .data(getLeafNodeText)
      .join((enter) =>
        enter
          .append("text")
          .attr("class", "node__label")
          .attr("dy", "0.32em")
          .attr("filter", "url(#treemapLabelShadow)")
          .attr("text-anchor", "middle")
      )
      .attr("x", (d) => d.left)
      .attr("y", (d) => d.top)
      .attr("font-size", (d) => d.fontSize)
      .text((d) => d.text);

    const parentLabels = nodeG
      .select(".node__labels")
      .filter((d) => d.height > 0);

    const zoomInControl = parentLabels
      .filter((d) => d.data.level > selectedData.level)
      .selectChildren()
      .data(getZoomInNodeText)
      .join((enter) =>
        enter
          .append("text")
          .attr("class", "node__label node__label--clickable")
          .attr("dy", "0.32em")
          .attr("filter", "url(#treemapLabelShadow)")
      )
      .attr("x", (d) => d.left)
      .attr("y", (d) => d.top)
      .attr("font-size", (d) => d.fontSize)
      .text((d) => d.text)
      .on("click", function () {
        const d = d3.select(this.parentNode).datum();
        zoomIn(d);
      });

    const zoomOutControl = parentLabels
      .filter((d) => d.data.level === selectedData.level)
      .selectChildren()
      .data(getZoomOutNodeText)
      .join((enter) =>
        enter
          .append("text")
          .attr(
            "class",
            (_, i) => `node__label ${i === 0 ? "node__label--clickable" : ""}`
          )
          .attr("dy", "0.32em")
          .attr("filter", "url(#treemapLabelShadow)")
      )
      .attr("x", (d) => d.left)
      .attr("y", (d) => d.top)
      .attr("font-size", (d) => d.fontSize)
      .text((d) => d.text)
      .call((text) => text.filter((_, i) => i === 0).on("click", zoomOut));
  }

  function zoomIn(d) {
    selectedDataParent = d.parent.data;
    selectedData = d.data;
    render();
  }

  function zoomOut() {
    selectedData = selectedDataParent;
    selectedDataParent = null;
    render();
  }

  function entered(event, d) {
    d3.select(this).classed("highlighted", true);
    tip.show(getTooltipContent(d.data), color(d.data.change));
    tip.move(event);
  }

  function moved(event) {
    tip.move(event);
  }

  function left() {
    d3.select(this).classed("highlighted", false);
    tip.hide();
  }

  function getTooltipContent(d) {
    const name = d.name;
    const gdp = formatValue(d.value);
    const gdpGrowth = formatChange(d.change);
    return /*html*/ `
      <div class="tooltip__title">${name}</div>
      <div>
        <div class="tooltip__key">GDP (current US$)</div>
        <div class="tooltip__value">${gdp}</div>
      </div>
      <div>
        <div class="tooltip__key">GDP growth (annual %)</div>
        <div class="tooltip__value">${gdpGrowth}</div>
      </div>
    `;
  }

  function getZoomInNodeText(d) {
    const charWidths = fontSettings.charWidths[parentLabelFontSize];
    const width = d.x1 - d.x0;
    const nameLabelWidth =
      width - parentLabelPadding * 2 - charWidths[" "] - charWidths["›"];
    const name = getLongestText(
      d.data.name.toUpperCase(),
      parentLabelFontSize,
      nameLabelWidth
    );
    return [
      {
        text: `${name} ›`,
        fontSize: parentLabelFontSize,
        left: parentLabelPadding,
        top: paddingTop / 2,
      },
    ];
  }

  function getZoomOutNodeText(d) {
    const texts = [];
    const charWidths = fontSettings.charWidths[parentLabelFontSize];
    const width = d.x1 - d.x0;
    const gap = 4;
    let availableWidth = width - parentLabelPadding * 2 - gap - charWidths["‹"];
    const parentName = getLongestText(
      selectedDataParent.name.toUpperCase(),
      parentLabelFontSize,
      availableWidth
    );
    let left = parentLabelPadding;
    texts.push({
      text: `‹ ${parentName}`,
      fontSize: parentLabelFontSize,
      left,
      top: paddingTop / 2,
    });
    const parentTextWidth = getTextWidth(parentName, parentLabelFontSize);
    availableWidth -= parentTextWidth + gap * 2 + charWidths["•"];
    const name = getLongestText(
      d.data.name.toUpperCase(),
      parentLabelFontSize,
      availableWidth
    );
    if (name) {
      left += parentTextWidth + charWidths["‹"] + charWidths[" "] + gap;
      texts.push({
        text: "•",
        fontSize: parentLabelFontSize,
        left,
        top: paddingTop / 2,
      });
      left += charWidths["•"] + gap;
      texts.push({
        text: name,
        fontSize: parentLabelFontSize,
        left,
        top: paddingTop / 2,
      });
    }
    console.log(texts);
    return texts;
  }

  function getTextWidth(text, fontSize) {
    const charWidths = fontSettings.charWidths[fontSize];
    return Array.from(text).reduce(
      (textWidth, char) => (textWidth += charWidths[char]),
      0
    );
  }

  function getLeafNodeText(d) {
    const texts = [];
    const width = d.x1 - d.x0;
    const height = d.y1 - d.y0;
    const left = width / 2;
    const code = d.data.code;
    const codeFontSize = findMaxFontSizeForText(
      code,
      width,
      height,
      fontSettings.fontSizes
    );
    if (codeFontSize) {
      const codeHeight = fontSettings.charHeights[codeFontSize];
      texts.push({
        text: code,
        fontSize: codeFontSize,
        height: codeHeight,
        left,
      });

      let change = formatChange(d.data.change);
      if (width <= 32) change = change.slice(0, -1); // remove % sign
      const changeFontSize = findMaxFontSizeForText(
        change,
        width,
        height - codeHeight,
        fontSettings.fontSizePairs[codeFontSize]
      );
      if (changeFontSize) {
        const changeHeight = fontSettings.charHeights[changeFontSize];
        texts.push({
          text: change,
          fontSize: changeFontSize,
          height: changeHeight,
          left,
        });
      }
    }
    if (texts.length) {
      const totalTextHeight = texts.reduce(
        (totalTextHeight, text) => (totalTextHeight += text.height),
        0
      );
      let top = height / 2 - totalTextHeight / 2;
      texts.forEach((text) => {
        text.top = top + text.height / 2;
        top += text.height;
      });
    }
    return texts;
  }

  function findMaxFontSizeForText(text, width, height, fontSizes) {
    return fontSizes.find(
      (fontSize) =>
        getLongestText(
          text,
          fontSize,
          Math.max(0, width - 2 * fontSettings.fontSizePadding[fontSize])
        ) === text && fontSettings.charHeights[fontSize] < height
    );
  }

  function getLongestText(text, fontSize, width) {
    if (width === 0) return "";
    const charWidths = fontSettings.charWidths[fontSize];
    let lastIndex = 0,
      accWidth = 0;
    while (
      lastIndex < text.length &&
      ((accWidth += charWidths[text[lastIndex]] ?? charWidths.W),
      !(accWidth > width))
    ) {
      lastIndex++;
    }
    return text.slice(0, lastIndex);
  }
}
