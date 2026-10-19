// Crack the Vault: every graphic in the game, drawn as SVG.
// Gradients live once in Art.defs() and are shared by all the drawings on the page.
(function (root) {
  "use strict";

  function defs() {
    return '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
      '<linearGradient id="g-frame" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3B4654"/><stop offset=".5" stop-color="#262F3A"/><stop offset="1" stop-color="#1A2129"/></linearGradient>' +
      '<radialGradient id="g-disc" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#C9D2DB"/><stop offset=".45" stop-color="#8E99A5"/><stop offset="1" stop-color="#4C5662"/></radialGradient>' +
      '<linearGradient id="g-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F4D58A"/><stop offset=".45" stop-color="#D9A441"/><stop offset="1" stop-color="#8A5C17"/></linearGradient>' +
      '<radialGradient id="g-knob" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#E9EEF2"/><stop offset="1" stop-color="#6B7682"/></radialGradient>' +
      '<linearGradient id="g-bolt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5E6874"/><stop offset=".5" stop-color="#D7DEE5"/><stop offset="1" stop-color="#5E6874"/></linearGradient>' +
      '<radialGradient id="g-rivet" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#9AA6B2"/><stop offset="1" stop-color="#2A333D"/></radialGradient>' +
      '<radialGradient id="g-glow" cx=".5" cy=".75" r=".7"><stop offset="0" stop-color="#F6C453" stop-opacity=".55"/><stop offset="1" stop-color="#F6C453" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="g-goldtop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF0B8"/><stop offset="1" stop-color="#F1C24F"/></linearGradient>' +
      '<linearGradient id="g-goldfront" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E2A92E"/><stop offset="1" stop-color="#A06B12"/></linearGradient>' +
      '<linearGradient id="g-safe" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7D8996"/><stop offset="1" stop-color="#3A444F"/></linearGradient>' +
      '<linearGradient id="g-box" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A333E"/><stop offset="1" stop-color="#1A2028"/></linearGradient>' +
      '<clipPath id="c-cavity"><circle cx="210" cy="210" r="172"/></clipPath>' +
      '<path id="p-arc" d="M 54 210 A 156 156 0 0 1 366 210"/>' +
      "</defs></svg>";
  }

  function n(v) { return Math.round(v * 100) / 100; }
  function polar(cx, cy, r, deg) { var a = (deg - 90) * Math.PI / 180; return [n(cx + r * Math.cos(a)), n(cy + r * Math.sin(a))]; }

  // ---- icons: 24 x 24, stroked in currentColor ----
  var ICONS = {
    back: '<path d="M15 5l-7 7 7 7"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    undo: '<path d="M4 5v5h5"/><path d="M5.6 15.5A7.5 7.5 0 1 0 7 7.4L4 10"/>',
    radio: '<rect x="7" y="7" width="10" height="14" rx="2"/><path d="M9.5 7V2.5"/><path d="M10 11h4M10 14h4"/><circle cx="12" cy="17.6" r=".6" fill="currentColor"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    soundOn: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10"/>',
    soundOff: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M16 10l4 4M20 10l-4 4"/>',
    floors: '<rect x="4" y="3.5" width="16" height="5" rx="1"/><rect x="4" y="9.5" width="16" height="5" rx="1"/><rect x="4" y="15.5" width="16" height="5" rx="1"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><path d="M12 15v2"/>',
    times: '<path d="M7 7l10 10M17 7L7 17"/>',
    clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M10 2.5h4"/>',
    ban: '<circle cx="12" cy="12" r="8.5"/><path d="M6 18L18 6"/>',
    infinity: '<path d="M5 12c0-1.9 1.3-3.2 3-3.2 3.4 0 4.6 6.4 8 6.4 1.7 0 3-1.3 3-3.2s-1.3-3.2-3-3.2c-3.4 0-4.6 6.4-8 6.4-1.7 0-3-1.3-3-3.2z"/>',
    replay: '<path d="M20 5v5h-5"/><path d="M18.4 15.5A7.5 7.5 0 1 1 17 7.4L20 10"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    stack: '<rect x="4" y="13" width="16" height="6" rx="1.5"/><rect x="4" y="5" width="16" height="6" rx="1.5"/><path d="M12 9.5v-3M10.5 8h3"/>',
    across: '<path d="M3 9h8M3 13.5h8"/><path d="M14 11h7M18 8l3 3-3 3"/>',
    tag: '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.4l-7.3 7.3a1 1 0 0 1-1.4 0z"/><circle cx="8" cy="8" r="1.4"/>',
    file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h4"/>',
    pencil: '<path d="M4 20l4.2-1L19 8.2a2 2 0 0 0 0-2.8l-.4-.4a2 2 0 0 0-2.8 0L5 15.8z"/><path d="M14.5 6.5l3 3"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'
  };
  function icon(name, size, cls) {
    return '<svg class="ic' + (cls ? " " + cls : "") + '" width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + "</svg>";
  }

  // ---- stars ----
  var STAR = "12,2.6 14.8,8.7 21.4,9.4 16.4,13.9 17.9,20.5 12,17.1 6.1,20.5 7.6,13.9 2.6,9.4 9.2,8.7";
  function star(on, size, cls) {
    return '<svg class="star' + (on ? " on" : "") + (cls ? " " + cls : "") + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true"><polygon points="' + STAR + '" fill="' + (on ? "url(#g-brass)" : "none") + '" stroke="' + (on ? "#8A5C17" : "currentColor") + '" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  }

  // ---- logo: a combination dial ----
  function logo(size) {
    var t = "";
    for (var i = 0; i < 24; i++) { var a = polar(24, 24, 19, i * 15), b = polar(24, 24, i % 6 ? 16.5 : 14.5, i * 15); t += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>'; }
    return '<svg class="logo" width="' + size + '" height="' + size + '" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="url(#g-brass)"/><circle cx="24" cy="24" r="20" fill="#141C26"/>' +
      '<g stroke="#D9A441" stroke-width="1.4">' + t + '</g><circle cx="24" cy="24" r="9" fill="url(#g-knob)"/><path d="M24 1.5l3 5h-6z" fill="#E5484D"/></svg>';
  }

  // ---- the vault door ----
  // positions for 1, 2 or 3 dials: [cx, cy, radius]
  var LAYOUT = {
    1: [[210, 150, 58]],
    2: [[140, 160, 48], [280, 160, 48]],
    3: [[118, 172, 40], [210, 122, 40], [302, 172, 40]]
  };
  function dial(v, d) {
    var cx = d[0], cy = d[1], R = d[2], ticks = "", labels = "";
    for (var i = 0; i < 20; i++) {
      var big = i % 5 === 0, a = polar(0, 0, R - 3, i * 18), b = polar(0, 0, R - (big ? 13 : 8), i * 18);
      ticks += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke-width="' + (big ? 2 : 1.2) + '"/>';
    }
    [["0", 0], ["5", 90], ["10", 180], ["−5", 270]].forEach(function (L) {
      var p = polar(0, 0, R - 22, L[1]);
      labels += '<text x="' + p[0] + '" y="' + p[1] + '" transform="rotate(' + L[1] + " " + p[0] + " " + p[1] + ')">' + L[0] + "</text>";
    });
    var rw = 76, ry = cy + R + 14;
    return '<g class="dial" data-v="' + v + '">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 9) + '" fill="url(#g-brass)" stroke="#5A3C0E" stroke-width="1.5"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="#18212B"/>' +
      '<g transform="translate(' + cx + " " + cy + ')"><g class="ring" stroke="#D9C49A">' + ticks + '<g class="dial-num" fill="#D9C49A" stroke="none" font-size="' + Math.round(R * 0.22) + '">' + labels + "</g></g></g>" +
      '<path d="M' + cx + " " + (cy - R - 2) + "l-6 -9h12z" + '" fill="#E5484D" stroke="#5A1416" stroke-width="1"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + n(R * 0.42) + '" fill="url(#g-knob)" stroke="#39424C" stroke-width="1.5"/>' +
      '<text class="dial-var" x="' + cx + '" y="' + (cy + R * 0.15) + '" font-size="' + Math.round(R * 0.5) + '">' + v + "</text>" +
      '<rect x="' + (cx - rw / 2) + '" y="' + ry + '" width="' + rw + '" height="26" rx="4" fill="#071016" stroke="url(#g-brass)" stroke-width="2"/>' +
      '<text class="readout" x="' + (cx - 6) + '" y="' + (ry + 18) + '">? ? ?</text>' +
      '<circle class="lamp" cx="' + (cx + rw / 2 - 10) + '" cy="' + (ry + 13) + '" r="4.5"/>' +
      "</g>";
  }
  function wheel() {
    var s = "";
    [0, 90, 180, 270].forEach(function (a) {
      var p = polar(0, 0, 38, a + 45);
      s += '<line x1="0" y1="0" x2="' + p[0] + '" y2="' + p[1] + '" stroke="url(#g-bolt)" stroke-width="8" stroke-linecap="round"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="7" fill="url(#g-knob)" stroke="#39424C"/>';
    });
    return '<g transform="translate(210 300)"><g class="wheel">' + s + '<circle r="15" fill="url(#g-knob)" stroke="#39424C" stroke-width="2"/><circle r="5" fill="#39424C"/></g></g>';
  }
  function bar(x, y) {
    return '<polygon points="' + (x + 5) + "," + (y - 7) + " " + (x + 37) + "," + (y - 7) + " " + (x + 42) + "," + y + " " + x + "," + y + '" fill="url(#g-goldtop)"/>' +
      '<rect x="' + x + '" y="' + y + '" width="42" height="13" fill="url(#g-goldfront)"/>';
  }
  function interior() {
    var boxes = "", gold = "", cash = "";
    for (var r = 0; r < 5; r++) for (var c = 0; c < 8; c++) {
      var x = 58 + c * 39, y = 52 + r * 34;
      boxes += '<rect x="' + x + '" y="' + y + '" width="35" height="30" rx="2" fill="url(#g-box)" stroke="#3A4552"/><circle cx="' + (x + 17.5) + '" cy="' + (y + 15) + '" r="2.5" fill="#B8913C"/>';
    }
    [[4, 118, 336], [3, 140, 316], [2, 162, 296], [1, 184, 276]].forEach(function (row) {
      for (var i = 0; i < row[0]; i++) gold += bar(row[1] + i * 46 - 4, row[2]);
    });
    for (var i = 0; i < 3; i++) {
      cash += '<rect x="' + (300 + i * 3) + '" y="' + (312 - i * 13) + '" width="46" height="12" rx="1.5" fill="#5E8C6A" stroke="#2F4A36"/><rect x="' + (319 + i * 3) + '" y="' + (312 - i * 13) + '" width="8" height="12" fill="#E9E3C8"/>';
      cash += '<rect x="' + (66 + i * 3) + '" y="' + (312 - i * 13) + '" width="46" height="12" rx="1.5" fill="#5E8C6A" stroke="#2F4A36"/><rect x="' + (85 + i * 3) + '" y="' + (312 - i * 13) + '" width="8" height="12" fill="#E9E3C8"/>';
    }
    return '<g clip-path="url(#c-cavity)"><rect x="30" y="30" width="360" height="360" fill="#080C12"/>' + boxes +
      '<rect x="30" y="226" width="360" height="8" fill="#2A333E"/><rect x="30" y="349" width="360" height="60" fill="#151B23"/>' +
      '<circle cx="210" cy="300" r="170" fill="url(#g-glow)"/>' + gold + cash + "</g>";
  }
  // the whole door: a fixed frame with the interior behind it, and a leaf that swings open
  function door(vars, maker) {
    var rivets = "", bolts = "", sockets = "", brushed = "";
    for (var i = 0; i < 9; i++) {
      var p = 26 + i * 46;
      rivets += '<circle cx="' + p + '" cy="22" r="4" fill="url(#g-rivet)"/><circle cx="' + p + '" cy="398" r="4" fill="url(#g-rivet)"/>';
      if (i > 0 && i < 8) rivets += '<circle cx="22" cy="' + p + '" r="4" fill="url(#g-rivet)"/><circle cx="398" cy="' + p + '" r="4" fill="url(#g-rivet)"/>';
    }
    for (i = 0; i < 12; i++) {
      var a = i * 30 + 15;
      sockets += '<g transform="rotate(' + a + ' 210 210)"><rect x="200" y="16" width="20" height="26" rx="3" fill="#0A0F15"/></g>';
      bolts += '<g transform="rotate(' + a + ' 210 210)"><rect class="bolt" x="202" y="20" width="16" height="34" rx="3" fill="url(#g-bolt)" stroke="#39424C"/></g>';
    }
    for (var r = 24; r < 160; r += 5) brushed += '<circle cx="210" cy="210" r="' + r + '" fill="none" stroke="' + (r % 10 ? "#FFFFFF" : "#000000") + '" stroke-opacity=".05"/>';
    var dials = (LAYOUT[vars.length] || LAYOUT[1]).map(function (d, i) { return dial(vars[i], d); }).join("");
    var back = '<svg class="door-back" viewBox="0 0 420 420" aria-hidden="true">' +
      '<rect x="4" y="4" width="412" height="412" rx="22" fill="url(#g-frame)" stroke="#0A0F15" stroke-width="2"/>' +
      '<rect x="12" y="12" width="396" height="396" rx="16" fill="none" stroke="#FFFFFF" stroke-opacity=".06"/>' + rivets +
      '<circle cx="210" cy="210" r="186" fill="#0A0F15"/>' + sockets + '<circle cx="210" cy="210" r="174" fill="#05080C"/>' + interior() +
      '<rect x="0" y="120" width="26" height="54" rx="5" fill="url(#g-bolt)" stroke="#39424C"/><rect x="0" y="246" width="26" height="54" rx="5" fill="url(#g-bolt)" stroke="#39424C"/>' +
      "</svg>";
    var leaf = '<svg class="door-leaf" viewBox="0 0 420 420" aria-hidden="true">' + bolts +
      '<circle cx="210" cy="210" r="168" fill="url(#g-disc)" stroke="#2A333D" stroke-width="3"/>' + brushed +
      '<circle cx="210" cy="210" r="152" fill="none" stroke="#FFFFFF" stroke-opacity=".25" stroke-width="1.5"/>' +
      '<circle cx="210" cy="210" r="149" fill="none" stroke="#000000" stroke-opacity=".25" stroke-width="1.5"/>' +
      '<text class="maker"><textPath href="#p-arc" startOffset="50%">' + (maker || "") + "</textPath></text>" +
      dials + wheel() + "</svg>";
    return '<div class="door-stage">' + back + '<div class="leaf-wrap">' + leaf + "</div></div>";
  }

  // ---- a small safe for the floor map ----
  function safe(state, boss) {
    var open = state === "open", trim = boss ? "url(#g-brass)" : "#2A333D", ticks = "";
    for (var i = 0; i < 8; i++) { var a = polar(32, 40, 11, i * 45), b = polar(32, 40, 8.5, i * 45); ticks += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>'; }
    var body = '<rect x="5" y="7" width="70" height="62" rx="8" fill="url(#g-safe)" stroke="' + trim + '" stroke-width="' + (boss ? 3 : 1.5) + '"/>' +
      '<rect x="12" y="68" width="10" height="6" rx="1.5" fill="#2A333D"/><rect x="58" y="68" width="10" height="6" rx="1.5" fill="#2A333D"/>';
    var inner;
    if (open) {
      inner = '<rect x="12" y="14" width="56" height="48" rx="4" fill="#080C12"/>' +
        '<polygon points="31,52 49,52 52,57 28,57" fill="url(#g-goldtop)"/><rect x="28" y="57" width="24" height="5" fill="url(#g-goldfront)"/>' +
        '<polygon points="37,45 49,45 51,52 35,52" fill="url(#g-goldtop)" opacity=".9"/>' +
        '<path d="M12 14 L2 20 L2 60 L12 62 Z" fill="#59636E" stroke="#2A333D"/>';
    } else {
      inner = '<rect x="12" y="14" width="56" height="48" rx="4" fill="#4A5561" stroke="#2A333D"/>' +
        '<circle cx="32" cy="40" r="12" fill="url(#g-brass)"/><circle cx="32" cy="40" r="10" fill="#18212B"/><g stroke="#D9C49A" stroke-width="1.2">' + ticks + "</g>" +
        '<circle cx="32" cy="40" r="4" fill="url(#g-knob)"/><rect x="54" y="30" width="5" height="20" rx="2" fill="url(#g-bolt)"/>';
    }
    return '<svg class="safe-art" viewBox="0 0 80 80" aria-hidden="true">' + body + inner + "</svg>";
  }

  // a single dial on its own, already set, for the how-to-play briefing
  function miniDial(v, text, open) {
    var d = dial(v, [60, 58, 40]).replace("? ? ?", text);
    return '<svg class="minidial" viewBox="0 0 120 142" aria-hidden="true">' + (open === false ? d : d.replace('class="dial"', 'class="dial solved"')) + "</svg>";
  }

  // a pointing hand for drag demos; the fingertip sits at (21, 3) in pixels
  function hand() {
    return '<svg width="48" height="57" viewBox="0 0 32 38" aria-hidden="true"><g fill="#FFFFFF" stroke="#0B121C" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">' +
      '<rect x="16" y="12" width="5" height="11" rx="2.5"/><rect x="20.5" y="13.5" width="5" height="10" rx="2.5"/><rect x="25" y="15.5" width="4.5" height="9" rx="2.25"/>' +
      '<path d="M11 23V5a3 3 0 0 1 6 0v18"/>' +
      '<path d="M11 21h18.5v5c0 5.5-4.5 9-9.5 9h-4.5c-3.5 0-5.8-2-7.2-4.6L4.2 24.3c-.9-1.7.9-3.4 2.6-2.3L11 25z"/>' +
      '<path d="M17 21v3.5M21.5 21v3.5M25.5 21v3" fill="none" stroke-width="1.2"/></g></svg>';
  }

  // ---- the bank at night, for the opening scene ----
  function bank() {
    var seed = 7, rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    var city = "", x = -20;
    while (x < 1620) {
      var w = 70 + rnd() * 110, h = 180 + rnd() * 320, top = 820 - h, win = "";
      if (x > 430 && x < 1170) { x += w + 6; continue; }
      for (var wy = top + 24; wy < 800; wy += 30) for (var wx = x + 12; wx < x + w - 14; wx += 22) if (rnd() < 0.16) win += '<rect x="' + n(wx) + '" y="' + n(wy) + '" width="9" height="13" fill="#F2CF7E" opacity="' + n(0.35 + rnd() * 0.5) + '"/>';
      city += '<rect x="' + n(x) + '" y="' + n(top) + '" width="' + n(w) + '" height="' + n(h) + '" fill="#0E1724"/>' + win;
      x += w + 6;
    }
    var cols = "";
    for (var i = 0; i < 6; i++) {
      var cx = 560 + i * 96;
      cols += '<rect x="' + (cx - 22) + '" y="470" width="44" height="300" fill="url(#g-col)"/><rect x="' + (cx - 30) + '" y="460" width="60" height="14" fill="#7C8794"/><rect x="' + (cx - 30) + '" y="766" width="60" height="12" fill="#5D6873"/>';
      for (var f = -14; f <= 14; f += 7) cols += '<line x1="' + (cx + f) + '" y1="478" x2="' + (cx + f) + '" y2="762" stroke="#000" stroke-opacity=".18"/>';
    }
    return '<svg class="bank-scene" viewBox="0 -220 1600 1120" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>' +
      '<linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#05080E"/><stop offset=".7" stop-color="#0E1A2C"/><stop offset="1" stop-color="#16263C"/></linearGradient>' +
      '<linearGradient id="g-col" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4F5B67"/><stop offset=".45" stop-color="#9AA6B2"/><stop offset="1" stop-color="#3F4954"/></linearGradient>' +
      '<radialGradient id="g-moon" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#E8EEF5" stop-opacity=".35"/><stop offset="1" stop-color="#E8EEF5" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="g-lamp" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#F6C453" stop-opacity=".45"/><stop offset="1" stop-color="#F6C453" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="g-doorlight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6C453" stop-opacity=".9"/><stop offset="1" stop-color="#D9A441" stop-opacity=".55"/></linearGradient>' +
      "</defs>" +
      '<rect y="-220" width="1600" height="1120" fill="url(#g-sky)"/>' +
      '<circle cx="1400" cy="40" r="190" fill="url(#g-moon)"/><circle cx="1400" cy="40" r="50" fill="#DCE4EE"/><circle cx="1383" cy="29" r="8" fill="#C4CEDA"/><circle cx="1413" cy="57" r="6" fill="#C4CEDA"/>' +
      city +
      // the bank
      '<rect x="470" y="430" width="660" height="400" fill="#121C29"/>' +
      '<polygon points="490,430 800,326 1110,430" fill="#56616D" stroke="#2A333D" stroke-width="3"/><polygon points="540,420 800,346 1060,420" fill="#424C57"/>' +
      '<rect x="480" y="426" width="640" height="40" fill="#6B7682"/>' +
      '<text class="bank-name" x="800" y="453">BERGMANN SAVINGS &amp; TRUST</text>' +
      '<rect x="752" y="560" width="96" height="210" fill="url(#g-doorlight)"/><rect x="752" y="560" width="96" height="210" fill="none" stroke="#2A333D" stroke-width="6"/>' +
      '<polygon points="752,770 848,770 990,900 610,900" fill="#F6C453" opacity=".12"/>' +
      '<rect x="604" y="520" width="44" height="70" fill="#0A1018"/><rect x="952" y="520" width="44" height="70" fill="#0A1018"/><rect x="956" y="524" width="36" height="62" fill="#F2CF7E" opacity=".35"/>' +
      cols +
      '<rect x="450" y="778" width="700" height="16" fill="#6B7682"/><rect x="420" y="794" width="760" height="14" fill="#5D6873"/><rect x="390" y="808" width="820" height="14" fill="#4F5A65"/>' +
      '<rect x="0" y="822" width="1600" height="78" fill="#070B11"/>' +
      // a street lamp
      '<rect x="318" y="560" width="8" height="262" fill="#1E2833"/><rect x="300" y="548" width="44" height="14" rx="4" fill="#1E2833"/>' +
      '<polygon points="302,562 342,562 420,822 224,822" fill="url(#g-lamp)"/><circle cx="322" cy="566" r="6" fill="#FFE4A0"/>' +
      "</svg>";
  }

  root.Art = { defs: defs, icon: icon, star: star, logo: logo, door: door, safe: safe, miniDial: miniDial, hand: hand, bank: bank };
})(window);
