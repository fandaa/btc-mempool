const $container = document.querySelector("#mempool-container");

const tzDate = (ts) => uPlot.tzDate(new Date(ts * 1e3), "Etc/UTC");

// converts the legend into a simple tooltip
function legendAsTooltipPlugin(
  {
    className,
    style = { backgroundColor: "rgba(255, 249, 196, 0.92)", color: "black" },
  } = {},
) {
  let legendEl;

  function init(u, opts) {
    legendEl = u.root.querySelector(".u-legend");

    legendEl.classList.remove("u-inline");
    className && legendEl.classList.add(className);

    uPlot.assign(legendEl.style, {
      textAlign: "left",
      pointerEvents: "none",
      display: "none",
      position: "absolute",
      left: 0,
      top: 0,
      zIndex: 100,
      boxShadow: "2px 2px 10px rgba(0,0,0,0.5)",
      ...style,
    });

    // hide series color markers
    const idents = legendEl.querySelectorAll(".u-marker");

    for (let i = 0; i < idents.length; i++) {
      idents[i].style.display = "none";
    }

    const overEl = u.root.querySelector(".u-over");
    overEl.style.overflow = "visible";

    // move legend into plot bounds
    overEl.appendChild(legendEl);

    // show/hide tooltip on enter/exit
    overEl.addEventListener("mouseenter", () => {
      legendEl.style.display = null;
    });
    overEl.addEventListener("mouseleave", () => {
      legendEl.style.display = "none";
    });

    // let tooltip exit plot
    //	overEl.style.overflow = "visible";
  }

  function update(u) {
    let { left } = u.cursor;

    if (left > (window.innerWidth / 2)) {
      left = left - 500;
    }

    legendEl.style.transform = "translate(" + (left + 20) + "px, " + 0 + "px)";
  }

  return {
    hooks: {
      init: init,
      setCursor: update,
    },
  };
}

function stack(data, omit) {
  let data2 = [];
  let accum = Array(data[0].length).fill(0);
  let bands = [];

  for (let i = 1; i < data.length; i++) {
    data2.push(omit(i) ? data[i] : data[i].map((v, i) => (accum[i] += +v)));
  }

  for (let i = 1; i < data.length; i++) {
    !omit(i) && bands.push({
      series: [
        data.findIndex((s, j) => j > i && !omit(j)),
        i,
      ],
      fill: () => null,
    });
  }

  bands = bands.filter((b) => b.series[1] > -1);

  return {
    data: [data[0]].concat(data2),
    bands,
  };
}

function getStackedOpts(title, series, data, axes) {
  let opts = getOpts(title, series, axes);

  opts.series.forEach((s, seriesIndex) => {
    if (seriesIndex === 0) {
      s.value = (u, v, si, i) => tzDate(data[si][i]);
    } else {
      s.value = (u, v, si, i) => {
        let total = 0
        for (let ind = si; ind < data.length; ind++) {
          total += data[ind][i]
        }
        // val = parseInt(data[si][i], 10).toLocaleString()
        return `${total.toLocaleString('en-US')} txs`
      };
    }
  });

  // force 0 to be the sum minimum this instead of the bottom series
  opts.scales.y = {
    range: (u, min, max) => {
      let minMax = uPlot.rangeNum(0, max, 0.1, true);
      return [0, minMax[1]];
    },
  };

  let stacked = stack(data, (i) => false);
  opts.bands = stacked.bands;

  // restack on toggle
  opts.hooks = {
    setSeries: [
      (u, i) => {
        let stacked = stack(data, (i) => !u.series[i].show);
        u.bands.length = 0;
        u.bands.push.apply(u.bands, stacked.bands);
        u.setData(stacked.data);
      },
    ],
  };

  return { opts, data: stacked.data };
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
    : null;
}

function stackedChart(title, series, _data) {
  let { opts, data } = getStackedOpts(title, series, _data);
  return new uPlot(opts, data, $container);
}

function getOpts(title, series) {
  return {
    plugins: [
      legendAsTooltipPlugin(),
    ],
    tzDate,
    title,
    width: window.innerWidth - 80,
    height: 600,
    scales: {},
    series,
  };
}

// deno-fmt-ignore
const palette = [
  "#535154", "#0000ac", "#0000c2", "#0000d8", "#0000ec", "#0000ff", "#2c2cff", "#5858ff", "#8080ff",
  "#008000", "#00a000", "#00c000", "#00e000", "#30e030", "#60e060", "#90e090",
  "#808000", "#989800", "#b0b000", "#c8c800", "#e0e000", "#e0e030", "#e0e060",
  "#800000", "#a00000", "#c00000", "#e00000", "#e02020", "#e04040", "#e06060",
  "#800080", "#ac00ac", "#d800d8", "#ff00ff", "#ff2cff", "#ff58ff", "#ff80ff",
  "#000000"
]

const colors = palette.map((color) => {
  const { r, g, b } = hexToRgb(color);
  return {
    fill: `rgba(${r},${g},${b},0.3)`,
    stroke: color,
  };
});

function plotData(data) {
  const mappedData = data.map((r) => {
    return {
      ...r,
      createdAtTimestamp: (new Date(r.createdAt)).getTime() / 1000,
    };
  }).reverse();

  // deno-fmt-ignore
  const FEE_SAT_GRANULARITY = [
    0.0001, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 
    12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
    110, 120, 130, 140, 150, 175, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000,
    1500, 2000, 2500,
  ]

  const seriesData = [
    mappedData.map((d) => d.createdAtTimestamp),
    ...(FEE_SAT_GRANULARITY.map((val, index) => {
      return mappedData.map((d) => d.counts[index]);
    })),
  ];

  let series = [
    { value: (u, ts) => fmtDate(tzDate(ts)) },
    ...(FEE_SAT_GRANULARITY.map((val, index) => {
      const colorIndex = index % colors.length;
      return {
        label: `${val}+ sat/B`,
        ...colors[colorIndex],
        value: (u, v) => parseInt(v, 10).toLocaleString(),
      };
    })),
  ];

  stackedChart(
    "Unconfirmed transactions",
    series,
    seriesData,
  );
}
