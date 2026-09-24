(function () {
  var TEAM = window.HTU_TEAM;

  // Biggest working size. Larger pictures are scaled down to this first.
  var MAX_SOURCE = 4096;
  // The on-screen previews are made from a smaller copy so the sliders feel quick.
  var PREVIEW_SIZE = 700;
  var MAX_EXPORT = 4096;

  var $ = function (id) { return document.getElementById(id); };

  var state = {
    image: null,        // the loaded <img>
    fileName: "logo",
    fullSource: null,   // canvas, capped at MAX_SOURCE
    previewSource: null,// canvas, capped at PREVIEW_SIZE
    bgColor: null,      // [r, g, b] of the background to remove
    previewResult: null // canvas of the finished (trimmed, outlined) logo
  };

  /* ---------- Settings from the controls ---------- */

  function settings() {
    return {
      removeBg: $("bg-on").checked,
      bgColor: state.bgColor,
      tolerance: Number($("tolerance").value),
      everywhere: $("bg-everywhere").checked,
      o1: $("o1-on").checked ? { color: $("o1-color").value, size: Number($("o1-size").value) } : null,
      o2: $("o2-on").checked ? { color: $("o2-color").value, size: Number($("o2-size").value) } : null,
      padding: Number($("padding").value)
    };
  }

  /* ---------- Loading a file ---------- */

  function loadFile(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      $("file-status").textContent = "That file isn't a PNG or JPG. Try saving your logo as one of those first.";
      return;
    }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      state.image = img;
      state.fileName = file.name.replace(/\.[^.]+$/, "") || "logo";
      state.fullSource = scaledCopy(img, MAX_SOURCE);
      state.previewSource = scaledCopy(img, PREVIEW_SIZE);
      $("file-status").textContent = "Loaded " + file.name + " (" + img.naturalWidth + " × " + img.naturalHeight + "). Drop another file to replace it.";
      $("compare").hidden = false;

      // A logo that already has a see-through background doesn't need removal.
      var alreadyClear = transparentBorderShare(state.previewSource) > 0.5;
      $("bg-on").checked = !alreadyClear;
      state.bgColor = detectBackground(state.previewSource);
      if (alreadyClear) {
        showWarning("This logo already has a see-through background, so background removal is turned off. You can turn it back on if you need it.");
      } else {
        showWarning("");
      }
      drawBefore();
      update();
      URL.revokeObjectURL(url);
    };
    img.onerror = function () {
      $("file-status").textContent = "Sorry, that picture couldn't be opened.";
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function scaledCopy(img, maxSide) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    var s = Math.min(1, maxSide / Math.max(w, h));
    return drawScaled(img, Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)));
  }

  function makeCanvas(w, h) {
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  // Resize in halving steps so big shrinks stay smooth instead of jagged.
  function drawScaled(src, w, h) {
    var cur = src;
    var cw = src.naturalWidth || src.width, ch = src.naturalHeight || src.height;
    while (cw / 2 > w && ch / 2 > h) {
      cw = Math.round(cw / 2);
      ch = Math.round(ch / 2);
      var step = makeCanvas(cw, ch);
      var sctx = step.getContext("2d");
      sctx.imageSmoothingQuality = "high";
      sctx.drawImage(cur, 0, 0, cw, ch);
      cur = step;
    }
    var out = makeCanvas(w, h);
    var ctx = out.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(cur, 0, 0, w, h);
    return out;
  }

  /* ---------- Background detection ---------- */

  function borderPixels(canvas, fn) {
    var w = canvas.width, h = canvas.height;
    var d = canvas.getContext("2d").getImageData(0, 0, w, h).data;
    for (var x = 0; x < w; x++) { fn(d, x * 4); fn(d, ((h - 1) * w + x) * 4); }
    for (var y = 1; y < h - 1; y++) { fn(d, (y * w) * 4); fn(d, (y * w + w - 1) * 4); }
  }

  function transparentBorderShare(canvas) {
    var clear = 0, total = 0;
    borderPixels(canvas, function (d, i) { total++; if (d[i + 3] < 16) clear++; });
    return total ? clear / total : 0;
  }

  // The most common color around the edge of the picture is almost always the background.
  function detectBackground(canvas) {
    var buckets = {};
    var best = null;
    borderPixels(canvas, function (d, i) {
      if (d[i + 3] < 200) return;
      var key = (d[i] >> 3) + "," + (d[i + 1] >> 3) + "," + (d[i + 2] >> 3);
      var b = buckets[key] || (buckets[key] = { n: 0, r: 0, g: 0, b: 0 });
      b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2];
      if (!best || b.n > best.n) best = b;
    });
    if (!best) return [255, 255, 255];
    return [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)];
  }

  /* ---------- The processing steps ---------- */

  // Makes the background see-through. Colors close to the background (within the
  // tolerance) go fully clear; colors just past it fade out so edges stay smooth.
  function removeBackground(imageData, bg, tolerance, everywhere) {
    var w = imageData.width, h = imageData.height, d = imageData.data;
    var hard = tolerance * 2.2;          // 0..220 on a 0..441 color-distance scale
    var soft = hard + 10 + hard * 0.15;  // a narrow fade band past the tolerance
    var n = w * h;
    var keep = new Float32Array(n);      // 1 = keep pixel as is, 0 = fully clear
    keep.fill(1);

    function distance(p) {
      var i = p * 4;
      if (d[i + 3] < 16) return 0; // already clear counts as background
      var dr = d[i] - bg[0], dg = d[i + 1] - bg[1], db = d[i + 2] - bg[2];
      return Math.sqrt(dr * dr + dg * dg + db * db);
    }
    function amount(dist) {
      return dist <= hard ? 0 : (dist - hard) / (soft - hard);
    }

    if (everywhere) {
      for (var p = 0; p < n; p++) {
        var dist = distance(p);
        if (dist < soft) keep[p] = amount(dist);
      }
    } else {
      // Flood fill in from the edges, so matching colors inside the logo are left alone.
      var seen = new Uint8Array(n);
      var queue = new Int32Array(n);
      var head = 0, tail = 0;
      var visit = function (q) {
        if (seen[q]) return;
        seen[q] = 1;
        var dist = distance(q);
        if (dist >= soft) return;
        keep[q] = amount(dist);
        if (dist <= hard) queue[tail++] = q; // only fully-background pixels spread further
      };
      for (var x = 0; x < w; x++) { visit(x); visit((h - 1) * w + x); }
      for (var y = 0; y < h; y++) { visit(y * w); visit(y * w + w - 1); }
      while (head < tail) {
        var q = queue[head++];
        var qx = q % w;
        if (qx > 0) visit(q - 1);
        if (qx < w - 1) visit(q + 1);
        if (q >= w) visit(q - w);
        if (q < n - w) visit(q + w);
      }
    }

    for (var k = 0; k < n; k++) {
      var a = keep[k];
      if (a >= 1) continue;
      var i = k * 4;
      if (a > 0) {
        // Take the background tint back out of half-clear edge pixels to avoid a halo.
        for (var c = 0; c < 3; c++) {
          d[i + c] = Math.max(0, Math.min(255, (d[i + c] - bg[c] * (1 - a)) / a));
        }
      }
      d[i + 3] = Math.round(d[i + 3] * a);
    }
    return imageData;
  }

  // Crops away empty see-through space so the logo can be centered exactly.
  function trim(canvas) {
    var w = canvas.width, h = canvas.height;
    var d = canvas.getContext("2d").getImageData(0, 0, w, h).data;
    var minX = w, minY = h, maxX = -1, maxY = -1;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    var out = makeCanvas(maxX - minX + 1, maxY - minY + 1);
    out.getContext("2d").drawImage(canvas, -minX, -minY);
    return out;
  }

  // Squared distance from every pixel to the nearest solid logo pixel
  // (Felzenszwalb & Huttenlocher distance transform).
  function distanceField(mask, w, h) {
    var INF = 1e20;
    var f = new Float64Array(w * h);
    for (var p = 0; p < f.length; p++) f[p] = mask[p] ? 0 : INF;
    var size = Math.max(w, h);
    var line = new Float64Array(size), out = new Float64Array(size);
    var v = new Int32Array(size), z = new Float64Array(size + 1);

    function pass(n) {
      var k = 0;
      v[0] = 0; z[0] = -INF; z[1] = INF;
      for (var q = 1; q < n; q++) {
        var s;
        do {
          var r = v[k];
          s = ((line[q] + q * q) - (line[r] + r * r)) / (2 * q - 2 * r);
        } while (s <= z[k] && --k >= 0);
        k++;
        v[k] = q; z[k] = s; z[k + 1] = INF;
      }
      k = 0;
      for (var q2 = 0; q2 < n; q2++) {
        while (z[k + 1] < q2) k++;
        var d = q2 - v[k];
        out[q2] = d * d + line[v[k]];
      }
    }

    for (var x = 0; x < w; x++) {
      for (var y = 0; y < h; y++) line[y] = f[y * w + x];
      pass(h);
      for (var y2 = 0; y2 < h; y2++) f[y2 * w + x] = out[y2];
    }
    for (var yy = 0; yy < h; yy++) {
      for (var x2 = 0; x2 < w; x2++) line[x2] = f[yy * w + x2];
      pass(w);
      for (var x3 = 0; x3 < w; x3++) f[yy * w + x3] = out[x3];
    }
    return f;
  }

  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Draws the outline(s) behind the logo. Thickness is a percent of the logo's
  // longest side, so the look stays the same at every export size.
  function addOutlines(logo, o1, o2) {
    if (!o1 && !o2) return logo;
    var longest = Math.max(logo.width, logo.height);
    var r1 = o1 ? longest * o1.size / 100 : 0;
    var r2 = o2 ? longest * o2.size / 100 : 0;
    var margin = Math.ceil(r1 + r2) + 2;
    var w = logo.width + margin * 2, h = logo.height + margin * 2;

    var canvas = makeCanvas(w, h);
    var ctx = canvas.getContext("2d");
    ctx.drawImage(logo, margin, margin);
    var src = ctx.getImageData(0, 0, w, h).data;

    var mask = new Uint8Array(w * h);
    for (var p = 0; p < mask.length; p++) mask[p] = src[p * 4 + 3] >= 128 ? 1 : 0;
    var dist2 = distanceField(mask, w, h);

    var c1 = o1 ? hexToRgb(o1.color) : null;
    var c2 = o2 ? hexToRgb(o2.color) : null;
    var layer = ctx.createImageData(w, h);
    var d = layer.data;
    for (var k = 0; k < mask.length; k++) {
      var dist = Math.sqrt(dist2[k]);
      // +0.5 and the clamp give the outline a soft, anti-aliased edge.
      var a1 = o1 ? Math.max(0, Math.min(1, r1 + 0.5 - dist)) : 0;
      var a2 = o2 ? Math.max(0, Math.min(1, r1 + r2 + 0.5 - dist)) : 0;
      var a = a1 + a2 * (1 - a1);
      if (a <= 0) continue;
      var i = k * 4;
      for (var c = 0; c < 3; c++) {
        d[i + c] = ((c1 ? c1[c] * a1 : 0) + (c2 ? c2[c] * a2 * (1 - a1) : 0)) / a;
      }
      d[i + 3] = Math.round(a * 255);
    }
    ctx.putImageData(layer, 0, 0);
    ctx.drawImage(logo, margin, margin);
    return canvas;
  }

  // Runs every step on a source canvas and returns the finished logo (or null if nothing is left).
  function processLogo(source, s) {
    var work = makeCanvas(source.width, source.height);
    var ctx = work.getContext("2d");
    ctx.drawImage(source, 0, 0);
    if (s.removeBg && s.bgColor) {
      var data = ctx.getImageData(0, 0, work.width, work.height);
      ctx.putImageData(removeBackground(data, s.bgColor, s.tolerance, s.everywhere), 0, 0);
    }
    var logo = trim(work);
    if (!logo) return null;
    return trim(addOutlines(logo, s.o1, s.o2));
  }

  // Places the finished logo centered on a W x H canvas with padding around it.
  function frame(logo, W, H, paddingPct, background) {
    var canvas = makeCanvas(W, H);
    var ctx = canvas.getContext("2d");
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, W, H);
    }
    var pad = Math.min(W, H) * paddingPct / 100;
    var scale = Math.min((W - pad * 2) / logo.width, (H - pad * 2) / logo.height);
    var dw = Math.max(1, Math.round(logo.width * scale));
    var dh = Math.max(1, Math.round(logo.height * scale));
    ctx.drawImage(drawScaled(logo, dw, dh), Math.round((W - dw) / 2), Math.round((H - dh) / 2));
    return canvas;
  }

  /* ---------- Screen updates ---------- */

  function showWarning(text) {
    $("warning").textContent = text;
    $("warning").hidden = !text;
  }

  function drawBefore() {
    var src = state.previewSource;
    var c = $("before-canvas");
    c.width = src.width;
    c.height = src.height;
    c.getContext("2d").drawImage(src, 0, 0);
  }

  function syncLabels() {
    $("tolerance-out").textContent = $("tolerance").value;
    $("o1-size-out").textContent = $("o1-size").value;
    $("o2-size-out").textContent = $("o2-size").value;
    $("padding-out").textContent = $("padding").value + "%";
    $("bg-on").closest("fieldset").classList.toggle("off", !$("bg-on").checked);
    $("o1-on").closest("fieldset").classList.toggle("off", !$("o1-on").checked);
    $("o2-on").closest("fieldset").classList.toggle("off", !$("o2-on").checked);
    var hex = state.bgColor ? rgbToHex(state.bgColor) : null;
    $("bg-hex").textContent = hex || "—";
    $("bg-swatch").style.background = hex || "#fff";
    document.querySelectorAll(".swatches").forEach(function (group) {
      var value = $(group.dataset.for).value.toUpperCase();
      group.querySelectorAll(".swatch").forEach(function (b) {
        b.classList.toggle("selected", b.dataset.hex.toUpperCase() === value);
      });
    });
  }

  function rgbToHex(rgb) {
    return "#" + rgb.map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join("").toUpperCase();
  }

  var pending = false;
  function update() {
    syncLabels();
    if (!state.previewSource || pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      var s = settings();
      state.previewResult = processLogo(state.previewSource, s);
      var after = $("after-canvas");
      if (!state.previewResult) {
        after.width = after.height = 1;
        after.getContext("2d").clearRect(0, 0, 1, 1);
        showWarning("Everything got removed. Slide Tolerance to the left, or click the background in the Before picture to pick the right color.");
      } else {
        if (/Everything got removed/.test($("warning").textContent)) showWarning("");
        var framed = frame(state.previewResult, PREVIEW_SIZE, PREVIEW_SIZE, s.padding);
        after.width = framed.width;
        after.height = framed.height;
        after.getContext("2d").drawImage(framed, 0, 0);
      }
      renderBackdrops(s);
    });
  }

  function backdropList() {
    return [{ name: "Light", hex: "#F4F6F8" }, { name: "Dark", hex: "#111418" }]
      .concat(TEAM.palette.map(function (c) { return { name: c.name, hex: c.hex }; }));
  }

  function renderBackdrops(s) {
    var box = $("backdrops");
    box.innerHTML = "";
    if (!state.previewResult) {
      var p = document.createElement("p");
      p.className = "empty";
      p.textContent = state.previewSource ? "Nothing to show yet." : "Choose a logo to see previews here.";
      box.appendChild(p);
      return;
    }
    var size = 320;
    backdropList().forEach(function (b) {
      var fig = document.createElement("figure");
      fig.className = "backdrop";
      fig.appendChild(frame(state.previewResult, size, size, s.padding, b.hex));
      var cap = document.createElement("figcaption");
      var code = document.createElement("code");
      code.textContent = b.hex;
      cap.append(b.name + " ", code);
      fig.appendChild(cap);
      box.appendChild(fig);
    });
  }

  /* ---------- Export ---------- */

  function exportPng(W, H) {
    var status = $("export-status");
    if (!state.fullSource) { status.textContent = "Choose a logo first."; return; }
    W = Math.round(W); H = Math.round(H);
    if (!(W >= 16 && H >= 16 && W <= MAX_EXPORT && H <= MAX_EXPORT)) {
      status.textContent = "Width and height need to be between 16 and " + MAX_EXPORT + " pixels.";
      return;
    }
    status.textContent = "Making your " + W + " × " + H + " PNG…";
    setTimeout(function () {
      var s = settings();
      // Work at about twice the final size (never more than the original) for clean edges.
      var longest = Math.max(state.fullSource.width, state.fullSource.height);
      var source = state.fullSource;
      var wanted = Math.max(W, H) * 2;
      if (longest > wanted) source = scaledCopy(state.fullSource, wanted);
      var logo = processLogo(source, s);
      if (!logo) { status.textContent = "Nothing left to export. Lower the Tolerance first."; return; }
      frame(logo, W, H, s.padding).toBlob(function (blob) {
        if (!blob) { status.textContent = "Sorry, the PNG couldn't be created in this browser."; return; }
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = TEAM.abbreviation + "-" + slug(state.fileName) + "-" + W + "x" + H + ".png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
        status.textContent = "Downloaded " + a.download + ".";
      }, "image/png");
    }, 20);
  }

  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "logo";
  }

  /* ---------- Wiring ---------- */

  document.querySelectorAll("[data-team]").forEach(function (el) {
    el.textContent = TEAM[el.getAttribute("data-team")];
  });

  // Team color quick-pick buttons next to each outline color.
  document.querySelectorAll(".swatches").forEach(function (group) {
    var input = $(group.dataset.for);
    TEAM.palette.concat([{ name: "Black", hex: "#000000" }]).forEach(function (c) {
      if (group.querySelector('[data-hex="' + c.hex + '"]')) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "swatch";
      b.dataset.hex = c.hex;
      b.title = c.name + " " + c.hex;
      b.setAttribute("aria-label", c.name);
      b.style.background = c.hex;
      b.addEventListener("click", function () {
        input.value = c.hex.toLowerCase();
        update();
      });
      group.appendChild(b);
    });
  });

  ["tolerance", "o1-size", "o2-size", "padding", "o1-color", "o2-color"].forEach(function (id) {
    $(id).addEventListener("input", update);
  });
  ["bg-on", "bg-everywhere", "o1-on", "o2-on"].forEach(function (id) {
    $(id).addEventListener("change", update);
  });

  $("bg-auto").addEventListener("click", function () {
    if (!state.previewSource) return;
    state.bgColor = detectBackground(state.previewSource);
    $("bg-on").checked = true;
    update();
  });

  $("before-canvas").addEventListener("click", function (e) {
    if (!state.previewSource) return;
    var c = e.currentTarget;
    var rect = c.getBoundingClientRect();
    var x = Math.floor((e.clientX - rect.left) / rect.width * c.width);
    var y = Math.floor((e.clientY - rect.top) / rect.height * c.height);
    var px = c.getContext("2d").getImageData(Math.min(x, c.width - 1), Math.min(y, c.height - 1), 1, 1).data;
    if (px[3] < 16) return; // clicked an already see-through spot
    state.bgColor = [px[0], px[1], px[2]];
    $("bg-on").checked = true;
    update();
  });

  $("file-input").addEventListener("change", function (e) {
    loadFile(e.target.files[0]);
    e.target.value = "";
  });

  var zone = $("dropzone");
  ["dragenter", "dragover"].forEach(function (t) {
    zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.add("dragging"); });
  });
  ["dragleave", "drop"].forEach(function (t) {
    zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.remove("dragging"); });
  });
  zone.addEventListener("drop", function (e) {
    loadFile(e.dataTransfer.files[0]);
  });
  // Dropping a file anywhere else on the page shouldn't navigate away from it.
  window.addEventListener("dragover", function (e) { e.preventDefault(); });
  window.addEventListener("drop", function (e) { e.preventDefault(); });

  document.querySelectorAll("[data-size]").forEach(function (b) {
    b.addEventListener("click", function () {
      var n = Number(b.dataset.size);
      exportPng(n, n);
    });
  });
  $("download-custom").addEventListener("click", function () {
    exportPng(Number($("custom-w").value), Number($("custom-h").value));
  });

  syncLabels();
  renderBackdrops(settings());
})();
