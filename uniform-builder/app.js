(function () {
  var TEAM = window.HTU_TEAM;
  var STORAGE_KEY = "htu.uniformBuilder.combos";

  // The uniform parts you can color, in the order they appear on screen.
  var PARTS = [
    { key: "helmetShell",   label: "Helmet shell" },
    { key: "facemask",      label: "Facemask" },
    { key: "helmetStripe",  label: "Helmet stripe" },
    { key: "jersey",        label: "Jersey body" },
    { key: "numbers",       label: "Jersey numbers" },
    { key: "numberOutline", label: "Number outline" },
    { key: "sleeveStripes", label: "Sleeve stripes" },
    { key: "pants",         label: "Pants" },
    { key: "pantsStripe",   label: "Pants stripe" },
    { key: "socks",         label: "Socks" }
  ];

  // Starter combos, only added the very first time the page is opened.
  function starterCombos() {
    var c = TEAM.color;
    return [
      { name: "Home", number: "1", colors: {
        helmetShell: c("navy"), facemask: c("white"), helmetStripe: c("teal"),
        jersey: c("navy"), numbers: c("white"), numberOutline: c("teal"),
        sleeveStripes: c("sunset-orange"), pants: c("white"), pantsStripe: c("teal"), socks: c("navy") } },
      { name: "Away", number: "1", colors: {
        helmetShell: c("navy"), facemask: c("white"), helmetStripe: c("teal"),
        jersey: c("white"), numbers: c("navy"), numberOutline: c("teal"),
        sleeveStripes: c("teal"), pants: c("navy"), pantsStripe: c("sunset-orange"), socks: c("white") } },
      { name: "Military Alternate", number: "1", colors: {
        helmetShell: c("olive-drab"), facemask: c("navy"), helmetStripe: c("navy"),
        jersey: c("olive-drab"), numbers: c("white"), numberOutline: c("navy"),
        sleeveStripes: c("navy"), pants: c("olive-drab"), pantsStripe: c("navy"), socks: c("navy") } }
    ];
  }

  /* ---------- Storage ---------- */

  function loadCombos() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        var starters = starterCombos();
        saveCombos(starters);
        return starters;
      }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return starterCombos();
    }
  }

  function saveCombos(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- Color helpers ---------- */

  function normalizeHex(value) {
    var v = String(value || "").trim().replace(/^#/, "");
    if (/^[0-9a-f]{3}$/i.test(v)) v = v.split("").map(function (ch) { return ch + ch; }).join("");
    return /^[0-9a-f]{6}$/i.test(v) ? "#" + v.toUpperCase() : null;
  }

  function slug(s) {
    return String(s).trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "combo";
  }

  /* ---------- State ---------- */

  var combos = loadCombos();
  var first = combos[0] || starterCombos()[0];
  var current = { name: first.name, number: first.number, colors: Object.assign({}, first.colors) };
  var rows = {};

  /* ---------- Fill in team text from the shared settings ---------- */

  document.querySelectorAll("[data-team]").forEach(function (el) {
    el.textContent = TEAM[el.getAttribute("data-team")];
  });
  document.title = TEAM.abbreviation + " Uniform Builder";

  /* ---------- Color controls ---------- */

  function buildControls() {
    var container = document.getElementById("color-rows");
    PARTS.forEach(function (part) {
      var row = document.createElement("div");
      row.className = "color-row";

      var inputId = "color-" + part.key;
      var label = document.createElement("label");
      label.htmlFor = inputId;
      label.textContent = part.label;

      var picker = document.createElement("input");
      picker.type = "color";
      picker.id = inputId;

      var hex = document.createElement("input");
      hex.type = "text";
      hex.className = "hex";
      hex.maxLength = 7;
      hex.spellcheck = false;
      hex.setAttribute("aria-label", part.label + " hex code");

      var swatches = document.createElement("div");
      swatches.className = "swatches";
      TEAM.palette.forEach(function (p) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "swatch";
        b.style.background = p.hex;
        b.title = p.name + " " + p.hex;
        b.setAttribute("aria-label", part.label + ": " + p.name);
        b.dataset.hex = p.hex.toUpperCase();
        b.addEventListener("click", function () { setColor(part.key, p.hex); });
        swatches.appendChild(b);
      });

      picker.addEventListener("input", function () { setColor(part.key, picker.value); });
      hex.addEventListener("input", function () {
        var v = normalizeHex(hex.value);
        hex.classList.toggle("invalid", !v);
        if (v && hex.value.replace(/^#/, "").length === 6) setColor(part.key, v, true);
      });
      hex.addEventListener("blur", function () {
        var v = normalizeHex(hex.value);
        setColor(part.key, v || current.colors[part.key]);
      });
      hex.addEventListener("keydown", function (e) { if (e.key === "Enter") hex.blur(); });

      row.append(label, picker, hex, swatches);
      container.appendChild(row);
      rows[part.key] = { picker: picker, hex: hex, swatches: swatches };
    });
  }

  function setColor(key, value, fromHexBox) {
    var v = normalizeHex(value);
    if (!v) return;
    current.colors[key] = v;
    syncRow(key, fromHexBox);
    renderPreview();
  }

  function syncRow(key, skipHexBox) {
    var r = rows[key];
    var v = current.colors[key];
    r.picker.value = v.toLowerCase();
    if (!skipHexBox) { r.hex.value = v; r.hex.classList.remove("invalid"); }
    r.swatches.querySelectorAll(".swatch").forEach(function (s) {
      s.classList.toggle("selected", s.dataset.hex === v);
    });
  }

  function syncAll() {
    PARTS.forEach(function (p) { syncRow(p.key); });
    document.getElementById("jersey-number").value = current.number;
    document.getElementById("combo-name").value = current.name;
    renderPreview();
  }

  function renderPreview() {
    document.getElementById("preview").innerHTML = playerSVG(current.colors, current.number);
    highlightActiveCard();
  }

  /* ---------- Saving ---------- */

  var statusEl = document.getElementById("save-status");
  function status(msg) { statusEl.textContent = msg; }

  document.getElementById("jersey-number").addEventListener("input", function (e) {
    current.number = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
    e.target.value = current.number;
    renderPreview();
  });

  document.getElementById("combo-name").addEventListener("input", function (e) {
    current.name = e.target.value;
    highlightActiveCard();
  });

  document.getElementById("save-combo").addEventListener("click", function () {
    var name = document.getElementById("combo-name").value.trim();
    if (!name) {
      status("Type a name for this combo first (like Home or Away).");
      document.getElementById("combo-name").focus();
      return;
    }
    var snapshot = { name: name, number: current.number, colors: Object.assign({}, current.colors) };
    var idx = findCombo(name);
    if (idx >= 0) {
      if (!confirm('Replace the saved combo "' + combos[idx].name + '" with these colors?')) return;
      combos[idx] = snapshot;
    } else {
      combos.push(snapshot);
    }
    current.name = name;
    var ok = saveCombos(combos);
    renderSaved();
    status(ok ? 'Saved "' + name + '".' : "Couldn't save. Your browser may be blocking storage (private mode?).");
  });

  document.getElementById("download-current").addEventListener("click", function () {
    downloadPng({ name: current.name.trim() || "Custom", number: current.number, colors: current.colors });
  });

  function findCombo(name) {
    var n = String(name).trim().toLowerCase();
    for (var i = 0; i < combos.length; i++) {
      if (combos[i].name.trim().toLowerCase() === n) return i;
    }
    return -1;
  }

  /* ---------- Saved combos (side by side) ---------- */

  function renderSaved() {
    var grid = document.getElementById("saved-grid");
    grid.innerHTML = "";
    document.getElementById("saved-count").textContent = "(" + combos.length + ")";

    if (!combos.length) {
      var p = document.createElement("p");
      p.className = "empty";
      p.textContent = "No saved combos yet. Pick some colors, give them a name, and click Save combo.";
      grid.appendChild(p);
      return;
    }

    combos.forEach(function (combo, i) {
      var card = document.createElement("article");
      card.className = "combo-card";
      card.dataset.name = combo.name.trim().toLowerCase();

      var h = document.createElement("h3");
      h.textContent = combo.name;

      var art = document.createElement("div");
      art.innerHTML = playerSVG(combo.colors, combo.number);

      var chips = document.createElement("div");
      chips.className = "chips";
      PARTS.forEach(function (part) {
        var chip = document.createElement("span");
        chip.className = "chip";
        chip.style.background = combo.colors[part.key];
        chip.title = part.label + ": " + (TEAM.nameFor(combo.colors[part.key]) || combo.colors[part.key]);
        chips.appendChild(chip);
      });

      var actions = document.createElement("div");
      actions.className = "card-actions";
      actions.append(
        button("Edit", function () {
          current = { name: combo.name, number: combo.number, colors: Object.assign({}, combo.colors) };
          syncAll();
          status('Editing "' + combo.name + '". Click Save combo to keep changes.');
          window.scrollTo({ top: 0, behavior: "smooth" });
        }),
        button("PNG", function () { downloadPng(combo); }),
        button("Delete", function () {
          if (!confirm('Delete "' + combo.name + '"?')) return;
          combos.splice(i, 1);
          saveCombos(combos);
          renderSaved();
        }, "danger")
      );

      card.append(h, art, chips, actions);
      grid.appendChild(card);
    });
    highlightActiveCard();
  }

  function button(text, onClick, cls) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    if (cls) b.className = cls;
    b.addEventListener("click", onClick);
    return b;
  }

  function highlightActiveCard() {
    var n = String(current.name || "").trim().toLowerCase();
    document.querySelectorAll(".combo-card").forEach(function (card) {
      card.classList.toggle("active", card.dataset.name === n);
    });
  }

  /* ---------- PNG export ---------- */

  function downloadPng(combo) {
    var W = 1200, H = 1000;
    var canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext("2d");
    var font = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

    // Background and header band
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#f7f9fb");
    bg.addColorStop(1, "#dfe5ec");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = TEAM.color("navy");
    ctx.fillRect(0, 0, W, 120);
    ctx.fillStyle = TEAM.color("sunset-orange");
    ctx.fillRect(0, 120, W, 8);

    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.font = "900 46px " + font;
    ctx.fillText(TEAM.abbreviation, 40, 60);
    var abbrW = ctx.measureText(TEAM.abbreviation).width;
    ctx.font = "500 30px " + font;
    ctx.globalAlpha = 0.9;
    ctx.fillText(TEAM.fullName, 40 + abbrW + 20, 62);
    ctx.globalAlpha = 1;
    ctx.textAlign = "right";
    ctx.font = "700 36px " + font;
    ctx.fillStyle = TEAM.color("sunset-orange");
    ctx.fillText(combo.name, W - 40, 60);
    ctx.textAlign = "left";

    // Color legend
    var lx = 600, ly = 180, rowH = 72;
    ctx.fillStyle = "#16202c";
    ctx.font = "700 28px " + font;
    ctx.fillText("Uniform colors", lx, ly - 10);
    PARTS.forEach(function (part, i) {
      var y = ly + 30 + i * rowH;
      var hex = combo.colors[part.key];
      ctx.fillStyle = hex;
      roundRect(ctx, lx, y, 52, 52, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#16202c";
      ctx.font = "600 24px " + font;
      ctx.fillText(part.label, lx + 72, y + 16);
      ctx.fillStyle = "#5b6776";
      ctx.font = "400 20px " + font;
      var named = TEAM.nameFor(hex);
      ctx.fillText((named ? named + "  ·  " : "") + hex, lx + 72, y + 40);
    });

    ctx.fillStyle = "#5b6776";
    ctx.font = "400 18px " + font;
    ctx.fillText(TEAM.game, lx, H - 30);

    // Player drawing
    var img = new Image();
    img.onload = function () {
      ctx.drawImage(img, 80, 160, 440, 792);
      canvas.toBlob(function (blob) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = TEAM.abbreviation + "-" + slug(combo.name) + ".png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      }, "image/png");
    };
    img.onerror = function () { alert("Sorry, the image couldn't be created in this browser."); };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(playerSVG(combo.colors, combo.number, { width: 440 }));
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------- Start ---------- */

  buildControls();
  renderSaved();
  syncAll();
})();
