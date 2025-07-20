import colorLegend from "./color-legend.js";
import treemap from "./treemap.js";

Promise.all([
  d3.csv("./data/API_NY.GDP.MKTP.CD_DS2_en_csv_v2_75934.csv"),
  d3.csv("./data/API_NY.GDP.MKTP.KD.ZG_DS2_en_csv_v2_80832.csv"),
  d3.csv("./data/Metadata_Country_API_NY.GDP.MKTP.CD_DS2_en_csv_v2_75934.csv"),
  d3.json("./data/font-settings.json"),
]).then(([gdpCSV, gdpGrowthCSV, metaCSV, fontSettings]) => {
  const data = processData(gdpCSV, gdpGrowthCSV, metaCSV);

  const color = getColorScale();

  d3.select("#loader").remove();

  colorLegend({
    el: document.getElementById("legend"),
    color,
  });

  treemap({
    el: document.getElementById("chart"),
    data,
    color,
    fontSettings,
  });
});

function getColorScale() {
  const styles = getComputedStyle(document.documentElement);
  const negativeColor = styles.getPropertyValue("--color-negative");
  const neutralColor = styles.getPropertyValue("--color-neutral");
  const positiveColor = styles.getPropertyValue("--color-positive");
  const color = d3
    .scaleDiverging()
    .domain([-0.06, 0, 0.06])
    .interpolator(
      d3.piecewise(d3.interpolateHcl, [
        negativeColor,
        neutralColor,
        positiveColor,
      ])
    )
    .clamp(true);
  return color;
}

function processData(gdpCSV, gdpGrowthCSV, metaCSV) {
  const codeByName = new Map(
    metaCSV.map((d) => [d["TableName"], d["Country Code"]])
  );
  const gdpByCode = new Map(
    gdpCSV.map((d) => [d["Country Code"], +d["2023"] || null])
  );
  const gdpGrowthByCode = new Map(
    gdpGrowthCSV.map((d) => [
      d["Country Code"],
      d["2023"] ? +d["2023"] / 100 : null,
    ])
  );
  const data = {
    name: "World",
    code: codeByName.get("World"),
    level: 0,
    children: d3
      .groups(
        metaCSV.filter((d) => d["Region"] !== ""),
        (d) => d["Region"]
      )
      .map(([region, entries]) => {
        const code = codeByName.get(region);
        return {
          name: region,
          code,
          level: 1,
          children: entries
            .map((d) => {
              const code = d["Country Code"];
              const gdp = gdpByCode.get(code);
              const gdpGrowth = gdpGrowthByCode.get(code);
              return {
                name: d["TableName"],
                code,
                level: 2,
                value: gdp,
                change: gdpGrowth,
              };
            })
            .filter((d) => d.value !== null && d.change !== null),
        };
      }),
  };
  return data;
}
