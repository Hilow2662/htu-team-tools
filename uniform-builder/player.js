/*
 * Draws a front-view flat vector football player as an SVG string.
 * playerSVG(colors, number, options) -> "<svg ...>...</svg>"
 */
(function () {
  var SKIN = "#C68B59";
  var OUTLINE = "#111820";
  var CLEATS = "#1C1F24";
  var VIEW_W = 300;
  var VIEW_H = 540;
  var counter = 0;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  // Shapes reused for drawing and for clipping stripes.
  var HELMET = "M78 112 C70 34 230 34 222 112 L222 128 C222 136 215 142 207 142 L93 142 C85 142 78 136 78 128 Z";
  var SLEEVE_L = "M64 170 Q48 178 46 200 L41 240 L79 246 L86 204 Z";
  var SLEEVE_R = "M236 170 Q252 178 254 200 L259 240 L221 246 L214 204 Z";
  var TORSO = "M100 158 Q150 174 200 158 L236 170 L214 204 L216 334 L84 334 L86 204 L64 170 Z";
  var PANTS = "M86 326 L214 326 L221 424 L158 428 L151 368 L149 368 L142 428 L79 424 Z";

  window.playerSVG = function (c, number, opts) {
    opts = opts || {};
    var id = "p" + (++counter) + "_";
    var num = esc(String(number == null ? "" : number).slice(0, 2));
    var size = opts.width ? ' width="' + opts.width + '" height="' + Math.round(opts.width * VIEW_H / VIEW_W) + '"' : "";
    var o = ' stroke="' + OUTLINE + '" stroke-width="2.5" stroke-linejoin="round"';

    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + VIEW_W + " " + VIEW_H + '"' + size +
      ' role="img" aria-label="Uniform preview">' +
      "<defs>" +
      '<clipPath id="' + id + 'helmet"><path d="' + HELMET + '"/></clipPath>' +
      '<clipPath id="' + id + 'sleeves"><path d="' + SLEEVE_L + '"/><path d="' + SLEEVE_R + '"/></clipPath>' +
      '<clipPath id="' + id + 'pants"><path d="' + PANTS + '"/></clipPath>' +
      "</defs>" +

      // Shadow on the ground
      '<ellipse cx="150" cy="528" rx="92" ry="9" fill="#000" opacity="0.12"/>' +

      // Arms (behind the jersey)
      '<path d="M44 236 L77 242 L73 318 Q62 336 49 322 Z" fill="' + SKIN + '"' + o + "/>" +
      '<path d="M256 236 L223 242 L227 318 Q238 336 251 322 Z" fill="' + SKIN + '"' + o + "/>" +

      // Socks and cleats
      '<path d="M84 420 L140 422 L132 508 L96 508 Z" fill="' + c.socks + '"' + o + "/>" +
      '<path d="M160 422 L216 420 L204 508 L168 508 Z" fill="' + c.socks + '"' + o + "/>" +
      '<path d="M92 505 L134 505 Q142 520 130 527 L86 527 Q78 516 92 505 Z" fill="' + CLEATS + '"' + o + "/>" +
      '<path d="M166 505 L208 505 Q222 516 214 527 L170 527 Q158 520 166 505 Z" fill="' + CLEATS + '"' + o + "/>" +

      // Pants with side stripes and a belt
      '<path d="' + PANTS + '" fill="' + c.pants + '"/>' +
      '<g clip-path="url(#' + id + 'pants)">' +
      '<path d="M88 326 L100 326 L94 430 L80 430 Z" fill="' + c.pantsStripe + '"/>' +
      '<path d="M212 326 L200 326 L206 430 L220 430 Z" fill="' + c.pantsStripe + '"/>' +
      '<rect x="80" y="326" width="140" height="10" fill="#000" opacity="0.22"/>' +
      "</g>" +
      '<path d="' + PANTS + '" fill="none"' + o + "/>" +

      // Neck
      '<path d="M130 136 L170 136 L172 166 L128 166 Z" fill="' + SKIN + '"' + o + "/>" +

      // Jersey: sleeves, sleeve stripes, torso
      '<path d="' + SLEEVE_L + '" fill="' + c.jersey + '"/>' +
      '<path d="' + SLEEVE_R + '" fill="' + c.jersey + '"/>' +
      '<g clip-path="url(#' + id + 'sleeves)" fill="' + c.sleeveStripes + '">' +
      '<path d="M30 216 L92 226 L92 233 L30 223 Z"/>' +
      '<path d="M30 227 L92 237 L92 244 L30 234 Z"/>' +
      '<path d="M270 216 L208 226 L208 233 L270 223 Z"/>' +
      '<path d="M270 227 L208 237 L208 244 L270 234 Z"/>' +
      "</g>" +
      '<path d="' + SLEEVE_L + '" fill="none"' + o + "/>" +
      '<path d="' + SLEEVE_R + '" fill="none"' + o + "/>" +
      '<path d="' + TORSO + '" fill="' + c.jersey + '"' + o + "/>" +

      // V-neck collar trimmed in the sleeve stripe color
      '<path d="M116 161 L150 190 L184 161 Q150 172 116 161 Z" fill="' + c.sleeveStripes + '"' + o + "/>" +
      '<path d="M126 164 L150 182 L174 164 Q150 171 126 164 Z" fill="' + SKIN + '"/>' +

      // Jersey number
      '<text x="150" y="296" text-anchor="middle" font-family="\'Arial Black\', \'Helvetica Neue\', Arial, sans-serif"' +
      ' font-weight="900" font-size="84" letter-spacing="-2" fill="' + c.numbers + '" stroke="' + c.numberOutline + '"' +
      ' stroke-width="7" stroke-linejoin="round" paint-order="stroke fill">' + num + "</text>" +

      // Helmet shell with center stripe
      '<path d="' + HELMET + '" fill="' + c.helmetShell + '"/>' +
      '<g clip-path="url(#' + id + 'helmet)">' +
      '<rect x="139" y="20" width="22" height="70" fill="' + c.helmetStripe + '"/>' +
      '<path d="M100 60 Q120 44 145 42" stroke="#fff" stroke-width="7" fill="none" opacity="0.25" stroke-linecap="round"/>' +
      "</g>" +
      '<path d="' + HELMET + '" fill="none"' + o + "/>" +

      // Face
      '<path d="M108 84 Q150 72 192 84 L192 140 Q150 150 108 140 Z" fill="' + SKIN + '"' + o + "/>" +
      '<ellipse cx="134" cy="102" rx="5" ry="3.5" fill="' + OUTLINE + '"/>' +
      '<ellipse cx="166" cy="102" rx="5" ry="3.5" fill="' + OUTLINE + '"/>' +

      // Facemask
      '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M98 110 L202 110 M100 126 L200 126 M150 110 L150 144 M104 110 L108 138 Q150 150 192 138 L196 110"' +
      ' stroke="' + OUTLINE + '" stroke-width="8.5"/>' +
      '<path d="M98 110 L202 110 M100 126 L200 126 M150 110 L150 144 M104 110 L108 138 Q150 150 192 138 L196 110"' +
      ' stroke="' + c.facemask + '" stroke-width="5"/>' +
      "</g>" +
      "</svg>"
    );
  };
})();
