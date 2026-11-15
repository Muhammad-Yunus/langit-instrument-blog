(function () {
  "use strict";

  var canvas = document.getElementById("spectrumCanvas");
  if (!canvas) {
    return;
  }

  var ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  var screen = document.getElementById("spectrumScreen") || canvas.parentElement;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var BINS = 261;
  var WF_ROWS = 96;
  var FREQ_MIN = 139.8;
  var FREQ_MAX = 140.6;
  var DB_TOP = -20;
  var DB_BOTTOM = -120;
  var TRACE_INTERVAL = 55;
  var ROW_INTERVAL = 110;
  var MONO = '"JetBrains Mono", "Consolas", monospace';

  var palette = {
    bg: "#0a0c05",
    axis: "#8b8e75",
    text: "#d6d8c2",
    accent: "#e5e793",
    soft: "rgba(229, 231, 147, 0.42)",
    grid: "rgba(229, 231, 147, 0.12)",
    gridSoft: "rgba(229, 231, 147, 0.055)",
    labelBg: "rgba(9, 11, 4, 0.84)"
  };

  var signals = [
    { center: 140.2, power: -33.4, width: 0.0085, drift: 1.1, rate: 0.43 },
    { center: 140.037, power: -64, width: 0.007, drift: 0.8, rate: 0.27 },
    { center: 140.318, power: -71.5, width: 0.011, drift: 0.9, rate: 0.19 },
    { center: 139.912, power: -82, width: 0.006, drift: 0.7, rate: 0.31 },
    { center: 140.537, power: -76, width: 0.009, drift: 0.8, rate: 0.23 }
  ];

  var freq = new Float32Array(BINS);
  var levels = new Float32Array(BINS);
  var smoothNoise = new Float32Array(BINS);
  var noiseTarget = new Float32Array(BINS);
  var history = [];
  var lut = buildLut();
  var wfCanvas = document.createElement("canvas");
  wfCanvas.width = BINS;
  wfCanvas.height = WF_ROWS;
  var wfCtx = wfCanvas.getContext("2d");
  var wfImage = wfCtx ? wfCtx.createImageData(BINS, WF_ROWS) : null;
  var width = 0;
  var height = 0;
  var dpr = 1;
  var layout = null;
  var running = false;
  var visible = true;
  var rafId = 0;
  var lastTrace = 0;
  var lastRow = 0;
  var clock = 0;
  var seeded = false;
  var i;

  for (i = 0; i < BINS; i += 1) {
    freq[i] = FREQ_MIN + ((FREQ_MAX - FREQ_MIN) * i) / (BINS - 1);
    smoothNoise[i] = -104 + Math.random() * 6;
    noiseTarget[i] = smoothNoise[i];
  }

  function buildLut() {
    var stops = [
      [0, [7, 9, 3]],
      [0.22, [22, 28, 8]],
      [0.42, [58, 63, 13]],
      [0.6, [108, 112, 9]],
      [0.74, [156, 158, 18]],
      [0.86, [205, 208, 88]],
      [0.94, [229, 231, 147]],
      [1, [251, 252, 218]]
    ];
    var table = new Uint8ClampedArray(256 * 3);
    for (var n = 0; n < 256; n += 1) {
      var t = n / 255;
      var a = stops[0];
      var b = stops[stops.length - 1];
      for (var s = 0; s < stops.length - 1; s += 1) {
        if (t >= stops[s][0] && t <= stops[s + 1][0]) {
          a = stops[s];
          b = stops[s + 1];
          break;
        }
      }
      var span = b[0] - a[0] || 1;
      var f = (t - a[0]) / span;
      table[n * 3] = a[1][0] + (b[1][0] - a[1][0]) * f;
      table[n * 3 + 1] = a[1][1] + (b[1][1] - a[1][1]) * f;
      table[n * 3 + 2] = a[1][2] + (b[1][2] - a[1][2]) * f;
    }
    return table;
  }

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  function xOf(value) {
    return layout.left + ((value - FREQ_MIN) / (FREQ_MAX - FREQ_MIN)) * layout.width;
  }

  function yOf(value) {
    return layout.specTop + ((DB_TOP - value) / (DB_TOP - DB_BOTTOM)) * layout.specHeight;
  }

  function intensityToByte(db) {
    var value = clamp((db + 108) / 74, 0, 1);
    return Math.round(Math.pow(value, 0.72) * 255);
  }

  function computeLayout() {
    var padLeft = Math.max(28, width * 0.082);
    var padRight = 6;
    var padTop = 14;
    var padBottom = 13;
    var wfHeight = Math.max(42, height * 0.33);
    var gap = Math.max(9, height * 0.035);
    var specTop = padTop + 7;
    var specBottom = height - padBottom - wfHeight - gap;
    var wfTop = specBottom + gap;

    layout = {
      left: padLeft,
      right: width - padRight,
      width: width - padLeft - padRight,
      specTop: specTop,
      specBottom: specBottom,
      specHeight: Math.max(20, specBottom - specTop),
      wfTop: wfTop,
      wfBottom: height - padBottom,
      wfHeight: Math.max(20, height - padBottom - wfTop),
      gap: gap,
      font: Math.max(6.5, Math.min(9, width / 56)),
      small: Math.max(5.8, Math.min(7.5, width / 70))
    };
  }

  function buildLevels(t) {
    for (var index = 0; index < BINS; index += 1) {
      noiseTarget[index] =
        -104 +
        Math.sin(index * 0.21 + t * 0.9) * 1.8 +
        Math.sin(index * 0.07 - t * 0.35) * 1.4 +
        Math.random() * 2.6;
      smoothNoise[index] += (noiseTarget[index] - smoothNoise[index]) * 0.16;

      var power = Math.pow(10, smoothNoise[index] / 10);
      for (var s = 0; s < signals.length; s += 1) {
        var signal = signals[s];
        var db = signal.power + Math.sin(t * signal.rate + s) * signal.drift;
        var d = (freq[index] - signal.center) / signal.width;
        power += Math.pow(10, db / 10) * Math.exp(-0.5 * d * d);
      }
      levels[index] = 10 * Math.log10(power);
    }
  }

  function makeRow() {
    var row = new Uint8Array(BINS);
    for (var index = 0; index < BINS; index += 1) {
      row[index] = intensityToByte(levels[index]);
    }
    return row;
  }

  function seedHistory() {
    history.length = 0;
    for (var row = 0; row < WF_ROWS; row += 1) {
      buildLevels((row - WF_ROWS) * 0.12);
      history.unshift(makeRow());
    }
  }

  function drawGrid() {
    var dbTicks = [-20, -40, -60, -80, -100, -120];
    var index;
    var x;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.font = layout.small + "px " + MONO;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (index = 0; index < dbTicks.length; index += 1) {
      var y = Math.round(yOf(dbTicks[index])) + 0.5;
      ctx.strokeStyle = index === 0 ? palette.grid : palette.gridSoft;
      ctx.beginPath();
      ctx.moveTo(layout.left, y);
      ctx.lineTo(layout.right, y);
      ctx.stroke();
      ctx.fillStyle = palette.axis;
      ctx.fillText(String(dbTicks[index]), layout.left - 4, y);
    }

    ctx.strokeStyle = palette.gridSoft;
    for (index = 0; index < 9; index += 1) {
      x = Math.round(xOf(FREQ_MIN + index * 0.1)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, layout.specTop);
      ctx.lineTo(x, layout.wfBottom);
      ctx.stroke();
    }

    ctx.font = layout.small + "px " + MONO;
    ctx.fillStyle = palette.axis;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillText("dBm", 4, 10);
    ctx.textAlign = "right";
    ctx.fillText("MHz", layout.right, 10);

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    var labels = [139.8, 140.0, 140.2, 140.4, 140.6];
    for (index = 0; index < labels.length; index += 1) {
      ctx.fillText(labels[index].toFixed(1), xOf(labels[index]), layout.wfBottom + 2);
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = palette.axis;
    ctx.fillText("WATERFALL", layout.left, layout.wfTop - layout.gap / 2);
    ctx.textAlign = "right";
    ctx.fillText("TIME >", layout.right, layout.wfTop - layout.gap / 2);
    ctx.restore();
  }

  function drawTrace() {
    var index;
    var x;
    var y;
    var gradient = ctx.createLinearGradient(0, layout.specTop, 0, layout.specBottom);
    gradient.addColorStop(0, "rgba(229, 231, 147, 0.24)");
    gradient.addColorStop(1, "rgba(229, 231, 147, 0)");

    ctx.save();
    ctx.beginPath();
    for (index = 0; index < BINS; index += 1) {
      x = xOf(freq[index]);
      y = yOf(levels[index]);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.lineTo(layout.right, layout.specBottom);
    ctx.lineTo(layout.left, layout.specBottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    for (index = 0; index < BINS; index += 1) {
      x = xOf(freq[index]);
      y = yOf(levels[index]);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = "rgba(241, 243, 181, 0.92)";
    ctx.lineWidth = 1.1;
    ctx.shadowColor = "rgba(229, 231, 147, 0.7)";
    ctx.shadowBlur = 5;
    ctx.stroke();
    ctx.restore();
  }

  function drawMarker() {
    var peak = 0;
    for (var index = 1; index < BINS; index += 1) {
      if (levels[index] > levels[peak]) {
        peak = index;
      }
    }

    var x = xOf(freq[peak]);
    var y = yOf(levels[peak]);
    var label = "PEAK " + freq[peak].toFixed(3) + " MHz";
    var reading = levels[peak].toFixed(1) + " dBm";

    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = palette.soft;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, layout.specTop);
    ctx.lineTo(x, layout.specBottom);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.moveTo(x, y - 2);
    ctx.lineTo(x - 4.5, y - 9);
    ctx.lineTo(x + 4.5, y - 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.font = layout.font + "px " + MONO;
    var boxWidth = Math.max(ctx.measureText(label).width, ctx.measureText(reading).width) + 10;
    var boxHeight = layout.font * 2 + 10;
    var boxX = x + 8;
    if (boxX + boxWidth > layout.right - 2) {
      boxX = x - boxWidth - 8;
    }
    boxX = clamp(boxX, layout.left + 2, layout.right - boxWidth - 2);
    var boxY = layout.specTop + 2;

    ctx.fillStyle = palette.labelBg;
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = "rgba(229, 231, 147, 0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(boxX) + 0.5, Math.round(boxY) + 0.5, boxWidth, boxHeight);

    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillStyle = palette.accent;
    ctx.fillText(label, boxX + 5, boxY + 3);
    ctx.fillStyle = palette.text;
    ctx.fillText(reading, boxX + 5, boxY + 4 + layout.font);
    ctx.restore();
  }

  function drawWaterfall() {
    if (!wfImage || !wfCtx) {
      return;
    }

    for (var row = 0; row < WF_ROWS; row += 1) {
      var data = history[row] || history[history.length - 1];
      if (!data) {
        continue;
      }
      var offset = row * BINS * 4;
      for (var index = 0; index < BINS; index += 1) {
        var color = data[index] * 3;
        var pixel = offset + index * 4;
        wfImage.data[pixel] = lut[color];
        wfImage.data[pixel + 1] = lut[color + 1];
        wfImage.data[pixel + 2] = lut[color + 2];
        wfImage.data[pixel + 3] = 255;
      }
    }

    wfCtx.putImageData(wfImage, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(wfCanvas, layout.left, layout.wfTop, layout.width, layout.wfHeight);
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.round(layout.left) + 0.5,
      Math.round(layout.wfTop) + 0.5,
      layout.width,
      layout.wfHeight - 1
    );
    ctx.restore();
  }

  function render() {
    if (!layout || width < 2 || height < 2) {
      return;
    }
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);
    drawGrid();
    drawTrace();
    drawMarker();
    drawWaterfall();
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    computeLayout();
    if (!seeded) {
      seedHistory();
      seeded = true;
    }
    buildLevels(clock);
    render();
  }

  function frame(now) {
    rafId = 0;
    if (!running) {
      return;
    }
    clock = now / 1000;
    if (!lastTrace || now - lastTrace >= TRACE_INTERVAL) {
      buildLevels(clock);
      if (!lastRow || now - lastRow >= ROW_INTERVAL) {
        history.unshift(makeRow());
        while (history.length > WF_ROWS) {
          history.pop();
        }
        lastRow = now;
      }
      render();
      lastTrace = now;
    }
    rafId = window.requestAnimationFrame(frame);
  }

  function start() {
    if (running || reducedMotion.matches || document.hidden || !visible) {
      return;
    }
    running = true;
    lastTrace = 0;
    lastRow = 0;
    rafId = window.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function sync() {
    if (visible && !document.hidden && !reducedMotion.matches) {
      start();
    } else {
      stop();
      render();
    }
  }

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        visible = entries[0].isIntersecting;
        sync();
      },
      { threshold: 0.05 }
    );
    observer.observe(screen);
  }

  if ("ResizeObserver" in window) {
    var resizeObserver = new ResizeObserver(function () {
      resize();
    });
    resizeObserver.observe(screen);
  } else {
    window.addEventListener("resize", resize);
  }

  document.addEventListener("visibilitychange", sync);

  if (reducedMotion.addEventListener) {
    reducedMotion.addEventListener("change", sync);
  } else if (reducedMotion.addListener) {
    reducedMotion.addListener(sync);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      render();
    });
  }

  resize();
  sync();
})();
