export default function colorLegend({ el, color }) {
  const tickFormat = d3.format(".0%");

  const ticks = color.ticks(7);

  d3.select(el)
    .classed("color-legend", true)
    .selectChildren()
    .data(ticks)
    .join("div")
    .attr("class", "swatch")
    .style("background-color", (d) => color(d))
    .text((d) => tickFormat(d));
}
