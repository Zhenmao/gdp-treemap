// Compute the character dimension map for font size choices
export default function generateFontSettings({
  fontFamily = "sans-serif",
  fontWeight = "bold",
  fontSizes = [36, 30, 24, 20, 18, 14, 13, 12, 11, 10, 9, 8],
  fontSizePairsFractionThreshold = 0.6,
  fontSizePairsMaxCount = 5,
  fontSizePaddingStep = 4,
  chars = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "+",
    "-",
    "%",
    ".",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "‹",
    "›",
    "•",
  ],
}) {
  // For visualization only variables
  const rowHeight = 80;
  const colWidth = 40;

  const fontSizePairs = fontSizes.reduce((o, fs) => {
    const threshold = Math.max(
      Math.ceil(fs * fontSizePairsFractionThreshold),
      fontSizes[fontSizes.length - 1]
    );
    const i = fontSizes.findIndex((d) => d <= threshold);
    o[fs] = fontSizes.slice(i, i + fontSizePairsMaxCount);
    return o;
  }, {});

  const fontSizePadding = fontSizes.reduce((o, fs) => {
    o[fs] = Math.round(fs / 2 / fontSizePaddingStep) * fontSizePaddingStep;
    return o;
  }, {});

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.fontFamily = fontFamily;
  svg.style.fontWeight = fontWeight;
  svg.style.fontVariantNumeric = "tabular-nums";
  svg.setAttribute("width", colWidth * chars.length);
  svg.setAttribute("height", rowHeight * fontSizes.length);
  document.body.appendChild(svg);

  const charWidths = {};
  const charHeights = {};

  fontSizes.forEach((fs, i) => {
    charWidths[fs] = {};
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.style.fontSize = fs + "px";
    g.setAttribute("transform", `translate(0,${(i + 0.5) * rowHeight})`);
    svg.appendChild(g);
    chars.forEach((c, j) => {
      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      text.textContent = c;
      text.setAttribute("transform", `translate(${j * colWidth},0)`);
      g.appendChild(text);
      const { width } = text.getBBox();
      charWidths[fs][c] = Math.ceil(width * 100) / 100;
    });
    // Space
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.textContent = `. .`;
    text.setAttribute("transform", `translate(${chars.length * colWidth},0)`);
    g.appendChild(text);
    const { width } = text.getBBox();
    charWidths[fs][" "] =
      Math.ceil((width - charWidths[fs]["."] * 2) * 100) / 100;

    const { height } = g.getBBox();
    charHeights[fs] = Math.ceil(height);
  });

  return {
    fontFamily,
    fontSizes,
    fontSizePairs,
    fontSizePadding,
    charWidths,
    charHeights,
  };
}
