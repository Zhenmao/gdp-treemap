export default function tooltip({ el }) {
  let boundingRect, tipRect;

  const offset = 16;
  const padding = 4;
  const tooltip = d3.select(el).append("div").attr("class", "tooltip");

  function show(content, bgColor) {
    tooltip
      .html(content)
      .style("background-color", bgColor)
      .classed("visible", true);

    boundingRect = el.getBoundingClientRect();
    tipRect = tooltip.node().getBoundingClientRect();
  }

  function hide() {
    tooltip.classed("visible", false);
  }

  function move(event) {
    const [x0, y0] = d3.pointer(event, el);

    let x = x0 - tipRect.width / 2;
    if (x < padding) {
      x = padding;
    } else if (x + tipRect.width > boundingRect.width - padding) {
      x = boundingRect.width - padding - tipRect.width;
    }

    let y = y0 - offset - tipRect.height;
    if (y < padding) {
      y = y0 + offset;
      if (y + tipRect.height > boundingRect.height - padding) {
        y = boundingRect.height - padding - tipRect.height;
      }
    }

    tooltip.style("transform", `translate(${x}px,${y}px)`);
  }

  return {
    show,
    hide,
    move,
  };
}
