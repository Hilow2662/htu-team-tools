/*
 * ===================================================================
 *  HTU SHARED TEAM SETTINGS
 * ===================================================================
 *  Every tool in this project reads the team info and colors from
 *  this one file. Change something here and every tool picks it up.
 *
 *  To change a color: edit the "hex" value (keep the quotes and the #).
 *  A hex code is 6 characters, 0-9 and A-F, like "#0B1F3A".
 *  To add a color: copy one of the lines in "palette", paste it below,
 *  and give it a new id, name, and hex. Don't forget the comma.
 * ===================================================================
 */
window.HTU_TEAM = {
  schoolName: "Honolulu Tech",
  nickname: "Generals",
  fullName: "Honolulu Tech Generals",
  abbreviation: "HTU",
  game: "EA College Football 27 Team Builder",

  palette: [
    { id: "navy",          name: "Navy",          hex: "#0B1F3A" },
    { id: "teal",          name: "Teal",          hex: "#00818A" },
    { id: "sunset-orange", name: "Sunset Orange", hex: "#F26B21" },
    { id: "white",         name: "White",         hex: "#FFFFFF" },
    { id: "olive-drab",    name: "Olive Drab",    hex: "#4B5320" }
  ]
};

/* ---- Helpers (no need to edit below this line) ---- */

// Look up a palette color by id, e.g. HTU_TEAM.color("navy") -> "#0B1F3A"
window.HTU_TEAM.color = function (id) {
  var entry = window.HTU_TEAM.palette.find(function (c) { return c.id === id; });
  return entry ? entry.hex : "#000000";
};

// Find the palette name for a hex code, or null if it's a custom color.
window.HTU_TEAM.nameFor = function (hex) {
  var h = String(hex || "").toUpperCase();
  var entry = window.HTU_TEAM.palette.find(function (c) { return c.hex.toUpperCase() === h; });
  return entry ? entry.name : null;
};

// Expose the palette as CSS variables (e.g. var(--htu-navy)) so pages can theme themselves.
(function () {
  var root = document.documentElement;
  window.HTU_TEAM.palette.forEach(function (c) {
    root.style.setProperty("--htu-" + c.id, c.hex);
  });
})();
