// Crack the Vault: the game. Floor map, the workbench where rows are dragged and dropped,
// the vault door, tips from the Inside Man, scoring, and saved progress.
(function () {
  "use strict";
  var E = window.Engine, A = window.Art, S = window.Sfx;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "crack-the-vault/v1";

  var FLOORS = [
    { f: 1, eyebrow: "Ground floor", name: "Lockbox Lobby", dials: "One-dial lockboxes", topic: "One variable. Get x alone and the dial reads it.", base: 2000, timer: 120 },
    { f: 2, eyebrow: "Basement", name: "The Twin Safes", dials: "Two-dial safes", topic: "Two equations, two unknowns. Cancel a variable to crack the first dial.", base: 15000, timer: 240 },
    { f: 3, eyebrow: "Sub-basement", name: "The Deep Vault", dials: "Three-dial vaults", topic: "Three equations, three unknowns. Shrink it to a two-dial lock, then finish it off.", base: 90000, timer: 420 }
  ];
  var BOSS = 8, LEVELS = 9;
  var RANKS = [[0, "Rookie"], [8, "Lookout"], [24, "Locksmith"], [48, "Safecracker"], [81, "Mastermind"], [120, "Legend"]];
  // celebration lines from the original AlgebraNotebook
  var SLANG = ["LET'S GOOOOO!", "WHAT A SLAY!", "SHEEEESH!", "YOU'RE COOKING!", "GOATED!", "LOCKED IN.", "NO CAP, YOU ATE THAT.", "THAT HAD AURA.", "W RIZZ.", "MARK IT A W!", "LIKE A BOSS!", "THAT STANDS ON BUSINESS.", "YOU'RE GIVING GENIUS.", "PERIODT."];

  // ---- saved progress (this browser only) ----
  var save = (function () {
    var d = { best: {}, settings: { sound: true, timers: true, unlockAll: false }, seen: {}, mode: {} };
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.best) { d.best = s.best; Object.assign(d.settings, s.settings || {}); d.seen = s.seen || {}; d.mode = s.mode || {}; }
    } catch (e) { /* storage blocked: play without saving */ }
    return d;
  })();
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } }
  // "By hand" is a second pass on each floor, with its own stars, stored under keys like "2-4h"
  function bkey(f, l, h) { return f + "-" + l + (h ? "h" : ""); }
  function best(f, l, h) { return save.best[bkey(f, l, h)]; }
  function handOpen(f) { return save.settings.unlockAll || !!best(f, BOSS); }
  function totalStars() { return Object.keys(save.best).reduce(function (a, k) { return a + save.best[k].stars; }, 0); }
  function floorStars(f, h) { var t = 0; for (var l = 0; l < LEVELS; l++) { var b = best(f, l, h); if (b) t += b.stars; } return t; }
  function haul() { return Object.keys(save.best).reduce(function (a, k) { return a + save.best[k].loot; }, 0); }
  function rank() { var s = totalStars(), r = RANKS[0][1]; RANKS.forEach(function (x) { if (s >= x[0]) r = x[1]; }); return r; }
  function unlocked(f, l, h) {
    if (save.settings.unlockAll) return true;
    if (h) return l === 0 ? handOpen(f) : !!best(f, l - 1, true); if (l === 0) return f === 1 || !!best(f - 1, BOSS); return !!best(f, l - 1); }
  function boxName(f, l) { return l === BOSS ? f + "-BOSS" : f + "-" + String(l + 1).padStart(2, "0"); }
  function money(n) { return "$" + n.toLocaleString("en-US"); }
  function lootFor(f, l, stars, h) { var b = FLOORS[f - 1].base * (1 + l * 0.25) * (l === BOSS ? 2 : 1) * (h ? 1.5 : 1); return Math.round(b * [0, 0.6, 0.8, 1][stars] / 100) * 100; }
  function nextTarget() {
    for (var f = 1; f <= 3; f++) for (var l = 0; l < LEVELS; l++) if (unlocked(f, l) && !best(f, l)) return f + "-" + l;
    return "";
  }

  // ---- number formatting ----
  function num(p) { return p.d > 1 ? '<span class="frac"><span>' + Math.abs(p.n) + "</span><span>" + p.d + "</span></span>" : String(Math.abs(p.n)); }
  function signed(p) { return (p.n < 0 ? "−" : "") + num(p); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function mathText(t) { return '<span class="math">' + esc(t) + "</span>"; }

  // ---- top bar ----
  function renderTop(mode) {
    $("brand").innerHTML = A.logo(34) + '<span class="wordmark">Crack the Vault</span>';
    var inGame = mode === "game";
    $("crumb").hidden = !inGame; $("meters").hidden = !inGame;
    ["tipBtn", "undoBtn", "workBtn", "exitBtn"].forEach(function (id) { $(id).hidden = !inGame; });
    $("brand").classList.toggle("home", inGame);
    $("topbar").classList.toggle("game-mode", inGame);
    $("tipBtn").innerHTML = A.icon("radio", 18) + "Tip";
    $("undoBtn").title = "Undo";
    $("workBtn").innerHTML = A.icon("file", 18) + '<span class="lbl">Show work</span>'; $("workBtn").title = "Show work";
    $("undoBtn").innerHTML = A.icon("undo", 18) + '<span class="lbl">Undo</span>';
    $("exitBtn").innerHTML = A.icon("back", 18) + "Floors";
    $("settingsBtn").innerHTML = A.icon("sliders", 19);
    renderSound(); renderStats(mode);
  }
  function renderStats(mode) {
    $("stats").innerHTML = mode === "game"
      ? '<span class="optional">Haul <b>' + money(haul()) + "</b></span>"
      : "<span>Haul <b>" + money(haul()) + "</b></span><span>Stars <b>" + totalStars() + "/162</b></span>";
  }
  function renderSound() {
    $("soundBtn").innerHTML = A.icon(save.settings.sound ? "soundOn" : "soundOff", 19);
    $("soundBtn").setAttribute("aria-label", save.settings.sound ? "Sound on. Click to mute." : "Sound off. Click to turn on.");
  }

  // ---- floor map ----
  function renderMap() {
    stopTimer(); G = null; closePop(); closeModal(); clearGuide(); closeCaseFile();
    $("gameScreen").hidden = true; $("mapScreen").hidden = false;
    renderTop("map");
    var nx = nextTarget();
    var started = Object.keys(save.best).length > 0, cta;
    if (nx) {
      var p = nx.split("-"), name = +p[1] === BOSS ? "the " + FLOORS[p[0] - 1].name + " boss" : "Box " + boxName(+p[0], +p[1]);
      cta = '<button class="btn brass big" data-go="' + nx + '">' + (started ? "Continue: " + name : "Start your first job: " + name) + A.icon("next", 18) + "</button>";
    } else cta = '<span class="alldone">Every vault is cracked. Replay any box to chase three stars.</span>';
    var h = '<div class="map-inner"><div class="map-hero"><div class="hero-copy"><h1>Crack the <span>Vault</span></h1>' +
      '<p class="lede">You\'re a safecracker working your way down through a bank. Every lock is an equation, and its solution is the combination. Solve it and the door opens.</p>' +
      '<div class="hero-actions">' + cta + '<button class="btn" id="howBtn">' + A.icon("eye", 18) + "How to play</button></div></div>" +
      '<div class="rankcard"><small>Rank</small><small>Stars</small><small>Haul</small><b>' + rank() + "</b><b>" + totalStars() + "/162</b><b>" + money(haul()) + "</b></div></div>" +
      '<ol class="mission">' + [
        ["Read the lock", "Each lock is an equation."],
        ["Solve it", "Drag terms until each variable stands alone."],
        ["Open the door", "Each answer sets a dial."],
        ["Go deeper", "Beat the boss to unlock the next floor."]
      ].map(function (s, i) { return "<li><span class=\"step-n\">" + (i + 1) + "</span><div><b>" + s[0] + "</b><span>" + s[1] + "</span></div></li>"; }).join("") + "</ol>" +
      '<div class="section">';
    FLOORS.forEach(function (F, i) {
      if (i) h += '<div class="slab"></div>';
      var open = unlocked(F.f, 0), hOpen = handOpen(F.f), safes = "", minis = "", nextH = "";
      for (var l = 0; l < LEVELS; l++) {
        var b = best(F.f, l), ok = unlocked(F.f, l), boss = l === BOSS, stars = "";
        for (var s = 0; s < 3; s++) stars += A.star(b && b.stars > s, 15);
        safes += '<button class="safe' + (boss ? " boss" : "") + (nx === F.f + "-" + l ? " next" : "") + '" data-f="' + F.f + '" data-l="' + l + '" data-h="0"' + (ok ? "" : " disabled") +
          ' aria-label="' + (boss ? "Boss vault" : "Box " + boxName(F.f, l)) + (b ? ", " + b.stars + " stars" : "") + (ok ? "" : ", locked") + '">' +
          A.safe(b ? "open" : "closed", boss) + (ok ? "" : '<span class="padlock">' + A.icon("lock", 16) + "</span>") +
          '<span class="num">' + (boss ? "BOSS" : boxName(F.f, l)) + '</span><span class="srow">' + stars + "</span></button>";
        // the by-hand twin of this box, in the row underneath
        var bh = best(F.f, l, true), okh = unlocked(F.f, l, true), sh = "";
        for (s = 0; s < 3; s++) sh += A.star(bh && bh.stars > s, 11);
        if (okh && !bh && !nextH) nextH = l;
        minis += '<button class="safe mini' + (boss ? " boss" : "") + (nextH === l ? " next-h" : "") + '" data-f="' + F.f + '" data-l="' + l + '" data-h="1"' + (okh ? "" : " disabled") +
          ' aria-label="By hand, ' + (boss ? "boss vault" : "box " + boxName(F.f, l)) + (bh ? ", " + bh.stars + " stars" : "") + (okh ? "" : ", locked") + '">' +
          A.safe(bh ? "open" : "closed", boss) + '<span class="srow">' + sh + "</span></button>";
      }
      var handHead = '<div class="hand-head">' + A.icon("pencil", 15) + "<b>By hand</b><span>" +
        (hOpen ? "Do the arithmetic yourself &middot; 1.5&times; loot &middot; " + floorStars(F.f, true) + "/27 stars" : A.icon("lock", 13) + " Beat this floor's boss to open") + "</span></div>";
      h += '<div class="floor' + (open ? "" : " locked") + '"><div class="floor-label"><small>' + F.eyebrow + " &middot; " + F.dials + "</small><h2>" + F.name + "</h2><p>" + F.topic + "</p>" +
        '<div class="fstars">' + A.star(true, 15) + " " + floorStars(F.f) + "/27" + (open ? "" : " &middot; Beat the boss above to open") + "</div></div>" +
        '<div class="tracks"><div class="safes">' + safes + '</div><div class="handrow' + (hOpen ? "" : " shut") + '">' + handHead + '<div class="safes minis">' + minis + "</div></div></div></div>";
    });
    h += '</div><div class="map-foot"><span>Progress is saved in this browser.</span><span>Teachers: open Settings to unlock every floor.</span></div></div>';
    $("mapScreen").innerHTML = h;
  }
  $("mapScreen").addEventListener("click", function (e) {
    if (e.target.closest("#howBtn")) return openIntro(0);
    var go = e.target.closest("[data-go]");
    if (go) { var p = go.dataset.go.split("-"); return startVault(+p[0], +p[1]); }
    var b = e.target.closest(".safe"); if (!b || b.disabled) return;
    startVault(+b.dataset.f, +b.dataset.l, b.dataset.h === "1");
  });

  // ---- how to play: a four-step briefing, shown on the first visit and from the map ----
  function eqchip(t, cls) { return '<span class="eqchip' + (cls ? " " + cls : "") + '">' + t + "</span>"; }
  function arrow() { return '<span class="iv-arrow">' + A.icon("next", 26) + "</span>"; }
  var INTRO = [
    { title: "The job",
      body: "Every lock is an equation. Solve it, and the answer sets the dial.",
      art: function () { return '<div class="iv-row">' + eqchip("2<i>x</i> + 3 = 11") + arrow() + A.miniDial("x", "4") + arrow() + A.safe("open", false) + "</div>"; } },
    { title: "How you crack it",
      body: "Drag numbers across the = sign until <i>x</i> stands alone.",
      art: function () { return '<div class="demo" id="demo"><div class="demo-eq"></div>' + A.miniDial("x", "? ? ?") + '<div class="hand">' + A.hand() + "</div></div>"; },
      run: crackDemo },
    { title: "Go deeper",
      body: "Each floor adds an unknown. Beat the boss to unlock the next floor.",
      art: function () {
        return '<div class="iv-floors">' + [
          ["Ground floor", "Lockbox Lobby", "3<i>x</i> − 2 = 19"],
          ["Basement", "The Twin Safes", "<i>x</i> + <i>y</i> = 7<br><i>x</i> − <i>y</i> = 1"],
          ["Sub-basement", "The Deep Vault", "<i>x</i> + <i>y</i> + <i>z</i> = 6<br>&hellip;"]
        ].map(function (r, i) {
          return '<div class="iv-floor">' + A.safe("closed", i === 2) + "<div><small>" + r[0] + "</small><b>" + r[1] + '</b></div><span class="eqchip sm">' + r[2] + "</span></div>";
        }).join("") + "</div>";
      } },
    { title: "Earn three stars",
      body: "Stuck? Hit Tip. It costs a star.",
      art: function () {
        return '<div class="iv-stars">' + [["Cracked", "Open the lock"], ["Clean job", "Hit par"], ["Solo", "No tips"]]
          .map(function (s) { return "<div>" + A.star(true, 44) + "<b>" + s[0] + "</b><span>" + s[1] + "</span></div>"; }).join("") + "</div>";
      } }
  ];
  var HX = 21, HY = 3, demoTimers = [];
  function clearDemo() { demoTimers.forEach(clearTimeout); demoTimers = []; }
  // the hand drags +3 across the = sign, then the 2, and the dial locks; then it loops
  function crackDemo() {
    var box = $("demo"); if (!box) return;
    var eq = box.querySelector(".demo-eq"), hand = box.querySelector(".hand"), dial = box.querySelector(".dial"), ro = box.querySelector(".readout");
    function at(ms, fn) { demoTimers.push(setTimeout(function () { if ($("demo") === box) fn(); }, ms)); }
    function pos(el) { var b = box.getBoundingClientRect(), r = el.getBoundingClientRect(); return [r.left - b.left + r.width / 2, r.top - b.top + r.height / 2]; }
    function moveHand(p, ms) { hand.style.transitionDuration = (ms || 0) + "ms, 300ms"; hand.style.transform = "translate(" + (p[0] - HX) + "px," + (p[1] - HY) + "px)"; }
    function carry(tok, to, ms) {
      var a = pos(tok), tgt = [to[0], a[1]];
      moveHand(tgt, ms);
      tok.style.transition = "transform " + ms + "ms ease-in-out"; tok.style.transform = "translate(" + (tgt[0] - a[0]) + "px,-4px)";
    }
    function beyond(el) { var p = pos(el); return [p[0] + el.getBoundingClientRect().width / 2 + 46, p[1]]; }
    function loop() {
      clearDemo();
      eq.innerHTML = '<span>2<i>x</i></span><span class="tok" id="dk">+ 3</span><span class="d-eq">=</span><span id="dr">11</span>';
      dial.classList.remove("solved"); ro.textContent = "? ? ?";
      hand.classList.remove("press"); hand.style.opacity = 0;
      moveHand([box.clientWidth * 0.3, box.clientHeight + 10], 0);
      at(80, function () { hand.style.opacity = 1; moveHand(pos($("dk")), 800); });
      at(1050, function () { hand.classList.add("press"); $("dk").classList.add("lift"); });
      at(1350, function () { carry($("dk"), beyond($("dr")), 1000); });
      at(1850, function () { $("dk").textContent = "− 3"; });
      at(2500, function () { hand.classList.remove("press"); eq.innerHTML = '<span class="tok" id="dc">2</span><span><i>x</i></span><span class="d-eq">=</span><span class="pop-in" id="dr">8</span>'; });
      at(3200, function () { moveHand(pos($("dc")), 700); });
      at(4000, function () { hand.classList.add("press"); $("dc").classList.add("lift"); });
      at(4300, function () { carry($("dc"), beyond($("dr")), 1000); });
      at(4800, function () { $("dc").textContent = "÷ 2"; });
      at(5450, function () { hand.classList.remove("press"); eq.innerHTML = '<span class="ok"><i>x</i></span><span class="d-eq">=</span><span class="ok pop-in">4</span>'; });
      at(5900, function () { dial.classList.add("solved"); ro.textContent = "4"; hand.style.opacity = 0; });
      at(8200, loop);
    }
    loop();
  }
  function openIntro(i) {
    clearDemo();
    var s = INTRO[i], last = i === INTRO.length - 1, nx = nextTarget();
    var dots = INTRO.map(function (_, j) { return '<span class="' + (j === i ? "on" : "") + '"></span>'; }).join("");
    openModal('<div class="intro"><div class="intro-top"><small>How to play &middot; ' + (i + 1) + " of " + INTRO.length + '</small><button class="linkbtn" id="introSkip">Skip</button></div>' +
      "<h2>" + s.title + '</h2><div class="intro-art">' + s.art() + "</div><p>" + s.body + "</p>" +
      '<div class="intro-nav"><div class="dots">' + dots + "</div><div class=\"modal-actions\">" +
      (i ? '<button class="btn" id="introBack">' + A.icon("back", 18) + "Back</button>" : "") +
      (last ? '<button class="btn brass" id="introGo">' + (nx === "1-0" ? "Start Box 1-01" : "To the floors") + A.icon("next", 18) + "</button>"
        : '<button class="btn brass" id="introNext">Next' + A.icon("next", 18) + "</button>") + "</div></div></div>");
    $("modalBody").classList.add("wide");
    if (s.run) s.run();
    function done() { save.seen.intro = true; persist(); closeModal(); }
    $("introSkip").onclick = done;
    if (i) $("introBack").onclick = function () { openIntro(i - 1); };
    if (last) $("introGo").onclick = function () { done(); if (nx === "1-0") startVault(1, 0); };
    else $("introNext").onclick = function () { openIntro(i + 1); };
    ($("introNext") || $("introGo")).focus();
  }

  // ---- in-game hand guide: drags from one element to another (or taps one), three times ----
  function handGuide(a, b) {
    clearGuide();
    if (!a) return;
    var h = document.createElement("div"); h.className = "hand guide"; h.innerHTML = A.hand(); document.body.appendChild(h);
    function c(el) { var r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
    function T(p, s) { return "translate(" + (p[0] - HX) + "px," + (p[1] - HY) + "px) scale(" + s + ")"; }
    var p = c(a), q = b ? c(b) : p, start = [p[0] + 40, p[1] + 60];
    var frames = b
      ? [{ transform: T(start, 1), opacity: 0 }, { transform: T(p, 1), opacity: 1, offset: 0.22 }, { transform: T(p, 0.85), opacity: 1, offset: 0.32 },
         { transform: T(q, 0.85), opacity: 1, offset: 0.75 }, { transform: T(q, 1), opacity: 1, offset: 0.84 }, { transform: T(q, 1), opacity: 0 }]
      : [{ transform: T(start, 1), opacity: 0 }, { transform: T(p, 1), opacity: 1, offset: 0.4 }, { transform: T(p, 0.82), opacity: 1, offset: 0.55 },
         { transform: T(p, 1), opacity: 1, offset: 0.7 }, { transform: T(p, 1), opacity: 0 }];
    h.animate(frames, { duration: b ? 2300 : 1500, iterations: 3, easing: "ease-in-out" }).onfinish = function () { h.remove(); };
  }
  function clearGuide() { document.querySelectorAll(".hand.guide").forEach(function (h) { h.remove(); }); }

  // ---- a heist ----
  var G = null;
  function startVault(f, l, hand) {
    stopTimer(); closePop(); closeModal(); closeCaseFile();
    var v = E.makeVault(f, l);
    G = { f: f, l: l, hand: !!hand, pend: null, v: v, st: v.state, hist: [], log: [], t0: Date.now(), hint: false, alarms: 0, done: false, busy: false, zeroSeen: false, missTold: {},
      timeLeft: l === BOSS && save.settings.timers ? FLOORS[f - 1].timer : 0 };
    $("mapScreen").hidden = true; $("gameScreen").hidden = false;
    renderTop("game");
    var F = FLOORS[f - 1];
    $("crumb").innerHTML = "<small>" + F.eyebrow + " &middot; " + F.name + (hand ? " &middot; By hand" : "") + "</small><b>" + (l === BOSS ? "Boss vault" : "Box " + boxName(f, l)) + "</b>";
    var vars = v.vars;
    $("sheetHead").innerHTML = "<div><small>Sheet " + boxName(f, l) + " &middot; " + F.dials + "</small><h2>" + (l === BOSS ? "The Big One" : F.name) + '</h2></div><div class="brief">Find ' +
      listVars(vars) + " to set " + (vars.length === 1 ? "the dial" : vars.length === 2 ? "both dials" : "all three dials") + ". A clean job takes " + plural(v.par, "move") + " or fewer.</div>";
    $("titleblock").innerHTML = "<div>Project<b>Crack the Vault</b></div><div>Sheet<b>" + boxName(f, l) + "</b></div><div>Unknowns<b>" + vars.join(", ") + "</b></div><div>Par<b>" + plural(v.par, "move") + "</b></div>";
    $("legend").innerHTML = legend(f);
    $("door").className = "door-wrap"; $("door").innerHTML = A.door(vars, "BERGMANN SAFE CO.");
    $("declare").hidden = f === 1;
    $("declare").className = "declare";
    $("declare").innerHTML = '<button data-declare="none">' + A.icon("ban", 26) + "<b>Jammed</b><span>No combination can work</span></button>" +
      '<button data-declare="inf">' + A.icon("infinity", 26) + "<b>Any code</b><span>Endless combinations work</span></button>";
    $("feed").innerHTML = "";
    renderRows(); renderCombo(); updateDoor(); updateMeters();
    $("tipBtn").classList.remove("used");
    brief();
    // the first box on each floor points at the first move, free of charge
    if (l === 0) setTimeout(function () { if (G && G.v === v && !G.done) { var pl = E.plan(G.st); if (pl.length) highlight(pl[0]); } }, 700);
    startTimer();
  }
  function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }
  function listVars(vs) { vs = vs.map(function (v) { return "<i>" + v + "</i>"; }); return vs.length === 1 ? vs[0] : vs.slice(0, -1).join(", ") + " and " + vs[vs.length - 1]; }
  function legend(f) {
    var items = f === 1
      ? [["across", "Drag numbers across ="], ["times", "Multiply a row"]]
      : [["stack", "Drag a row onto a row to add"], ["times", "Multiply a row"], ["across", "Drag numbers across ="], ["tag", "Drag a tag onto its letter"]];
    if (G && G.hand) items.push(["pencil", "Type each new number, then press Enter"]);
    return items.map(function (x) { return "<span>" + A.icon(x[0], 18) + x[1] + "</span>"; }).join("");
  }
  function brief() {
    var f = G.f, l = G.l, vs = G.v.vars;
    say("Box " + boxName(f, l) + ". " + ["", "One dial", "Two dials", "Three dials"][vs.length] + " to crack. Par is " + plural(G.v.par, "move") + ".");
    if (G.hand) say("By hand: the bank's calculator is down. After each move, type the new numbers yourself.", "warn");
    if (l === 0 && f === 1) say("Follow the hand: drag the glowing number across the = sign.");
    if (l === 0 && f === 2) say("Follow the hand: drag one row onto the other to add them.");
    if (l === 2 && f === 2) say("Nothing cancels yet. Multiply a row first so a letter's terms become opposites.");
    if (l === 0 && f === 3) say("Use one row to cancel the same letter from the other two.");
    if ((f === 2 && (l === 5 || l === 6)) || (f === 3 && l === 6)) say("Heads up: some locks here are rigged. If a row becomes 0 = 0 or 0 = 5, call it below the vault.", "warn");
    if (l === BOSS) say("This is the big one." + (G.timeLeft ? " The guard is back in " + clock(G.timeLeft) + "." : ""), "warn");
  }

  // ---- the workbench rows ----
  function renderRows(changed, list) {
    var el = $("rows"), aligned = G.f > 1, vars = G.v.vars;
    el.className = "rows" + (aligned ? "" : " free") + (vars.length === 3 && aligned ? " three" : "");
    el.style.gridTemplateColumns = aligned ? "repeat(" + (vars.length + 5) + ", auto)" : "";
    el.innerHTML = (list || G.st.rows).map(function (r) { return rowHTML(r, aligned); }).join("");
    if (changed) { var c = el.querySelector('[data-id="' + changed + '"]'); if (c) c.classList.add("pop-in"); }
  }
  function rowHTML(r, aligned) {
    var vars = G.v.vars, single = E.varsIn(r).length === 1, canAdd = G.f > 1 && G.st.rows.length > 1, first = true, cells = "";
    var pend = G.pend && G.pend.row === r.id ? G.pend : null;
    var toks = vars.map(function (v) { return { v: v, c: r.co[v] }; }), kt = { c: r.k };
    if (!aligned && r.kFirst) toks.unshift(kt); else toks.push(kt);
    toks.forEach(function (t) {
      var sl = t.v || "k";
      if (pend && pend.map[sl] !== undefined) { cells += calcCell(sl, pend.slots[pend.map[sl]]); first = false; return; }
      if (E.isZ(t.c)) { if (aligned) cells += '<span class="cell" data-slot="' + sl + '"></span>'; return; }
      var neg = t.c.n < 0, op = first ? "" : '<span class="op">' + (neg ? "−" : "+") + "</span>", lead = first && neg ? "−" : "", mag = E.abs(t.c), h;
      if (t.v) {
        var co = E.isOne(mag) ? "" : num(mag);
        if (single && (co || lead)) co = '<span class="grab coef" data-drag="coef:' + r.id + '" title="Drag across the = sign to divide">' + lead + co + "</span>";
        else co = lead + co;
        h = '<span class="cell var" data-slot="' + t.v + '" data-drop="tag:' + t.v + '">' + op + co + "<i>" + t.v + "</i></span>";
      } else {
        h = '<span class="cell" data-slot="k"><span class="grab const" data-drag="const:' + r.id + '" title="Drag across the = sign">' + op + lead + num(mag) + "</span></span>";
      }
      cells += h; first = false;
    });
    if (first) cells = cells.replace(/<span class="cell" data-slot="(\w)"><\/span>/, '<span class="cell" data-slot="$1">0</span>') || '<span class="cell">0</span>';
    var zk = pend ? null : E.zeroKind(r);
    var rhs = pend && pend.map.c !== undefined ? calcCell("c", pend.slots[pend.map.c]) : '<span class="cell rhs" data-slot="c" data-drop="side:' + r.id + '">' + signed(r.c) + "</span>";
    var tail = pend ? '<button class="mulbtn calcgo" id="calcGo" aria-label="Check my answers" title="Check">' + A.icon("check", 20) + "</button>"
      : '<button class="mulbtn" data-mul="' + r.id + '" aria-label="Multiply row ' + r.id + '" title="Multiply every term">' + A.icon("times", 18) + "</button>";
    return '<div class="eqrow' + (zk ? " zero" : "") + (r.held ? " held" : "") + '" data-id="' + r.id + '" data-drop="row:' + r.id + '"' + (canAdd ? ' data-drag="row:' + r.id + '"' : "") + ">" +
      '<button class="grip' + (canAdd ? "" : " static") + '"' + (canAdd ? ' data-drag="row:' + r.id + '"' : "") + ' aria-label="Row ' + r.id + (canAdd ? ". Drag onto another row to add." : "") + '">' + r.id + "</button>" +
      cells + '<span class="cell eqsign">=</span>' + rhs + tail +
      (zk ? '<span class="stamp ' + zk + '">' + (zk === "none" ? "Impossible" : "Always true") + "</span>" : "") + "</div>";
  }

  // ---- combination tags and dials ----
  function renderCombo() {
    var subs = G.f > 1;
    $("combo").innerHTML = "<small>Combination</small>" + G.v.vars.map(function (v) {
      var val = G.st.solved[v];
      if (!val) return '<span class="tagchip empty"><i>' + v + "</i> = ?</span>";
      return subs ? '<button class="tagchip" data-drag="tag:' + v + '" aria-label="' + v + " equals " + E.str(val) + '. Drag onto a ' + v + ' to substitute.">' + "<i>" + v + "</i> = " + signed(val) + "</button>"
        : '<span class="tagchip static"><i>' + v + "</i> = " + signed(val) + "</span>";
    }).join("");
  }
  function updateDoor() {
    G.v.vars.forEach(function (v) {
      var d = $("door").querySelector('.dial[data-v="' + v + '"]'); if (!d) return;
      var val = G.st.solved[v], ring = d.querySelector(".ring"), ro = d.querySelector(".readout");
      d.classList.toggle("solved", !!val);
      ro.textContent = val ? E.str(val) : "? ? ?";
      ring.style.transform = "rotate(" + (val ? -(val.n / val.d) * 18 - 360 : 0) + "deg)";
    });
  }

  // ---- meters ----
  function updateMeters() {
    var mv = G.st.moves, par = G.v.par, fill = Math.min(1, mv / par) * 100;
    $("moveMeter").innerHTML = "Moves <b>" + String(mv).padStart(2, "0") + "</b> Par <b>" + String(par).padStart(2, "0") + '</b><span class="gauge' + (mv > par ? " over" : "") + '"><span style="width:' + fill + '%"></span></span>';
    $("alarmMeter").hidden = G.f === 1;
    $("alarmMeter").innerHTML = "Alarm" + [0, 1, 2].map(function (i) { return '<span class="light' + (i < G.alarms ? " on" : "") + '"></span>'; }).join("");
    $("undoBtn").disabled = (!G.hist.length && !G.pend) || G.done;
    $("tipBtn").disabled = G.done;
  }
  var timerId = null;
  function clock(t) { return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); }
  function renderTimer() { $("timer").hidden = !G.timeLeft && !G.timed; $("timer").classList.toggle("low", G.timeLeft <= 15); $("timer").innerHTML = A.icon("clock", 16) + "<b>" + clock(G.timeLeft) + "</b>"; }
  function startTimer() {
    $("timer").hidden = true;
    if (!G.timeLeft) return;
    G.timed = true; renderTimer();
    timerId = setInterval(function () {
      if (!G || G.done) return stopTimer();
      G.timeLeft--; renderTimer();
      if (G.timeLeft <= 15 && G.timeLeft > 0) S.beep();
      if (G.timeLeft <= 0) { stopTimer(); bust("timer"); }
    }, 1000);
  }
  function stopTimer() { clearInterval(timerId); timerId = null; }

  // ---- the Inside Man's radio feed ----
  function say(html, cls, who) {
    var d = document.createElement("div");
    d.className = "msg" + (cls ? " " + cls : "");
    d.innerHTML = A.icon(cls === "log" ? "check" : "radio", cls === "log" ? 14 : 18) + "<p>" + (cls === "log" ? "" : '<b class="who">' + (who || "Inside Man") + "</b>") + html + "</p>";
    $("feed").appendChild(d); $("feed").scrollTop = $("feed").scrollHeight;
    while ($("feed").children.length > 30) $("feed").removeChild($("feed").firstChild);
  }

  // ---- moves ----
  function doMove(res) {
    if (res.error) { say(esc(res.error), "warn"); S.error(); return false; }
    if (G.hand && startCalc(res)) return true;
    return commitMove(res, true);
  }
  function commitMove(res, animate) {
    var prev = G.st, mv = res.move;
    G.hist.push(prev); G.st = res.state;
    G.log.push({ mv: mv, st: res.state, t: Date.now() - G.t0, hand: !animate });
    say(describe(mv), "log");
    var changed = mv.type === "add" ? mv.tgt : mv.id;
    // a row that just got solved stays on the bench (as x = 4) until its number finishes animating
    var solved = res.events.filter(function (ev) { return ev.type === "solved"; }), held = {};
    solved.forEach(function (ev) {
      var co = { x: E.F(0), y: E.F(0), z: E.F(0) }; co[ev.v] = E.F(1);
      held[ev.id] = { id: ev.id, co: co, k: E.F(0), c: ev.value, kFirst: false, held: true };
    });
    var display = prev.rows.map(function (r) { return E.rowById(G.st, r.id) || held[r.id]; }).filter(Boolean);
    renderRows(changed, display); updateMeters();
    if (mv.type === "add" && mv.cancelled.length) S.cancel(); else S.drop();
    var dur = animate ? animateResult(mv, E.rowById(prev, changed), display.filter(function (r) { return r.id === changed; })[0]) : 0;
    if (!animate) { var ce = $("rows").querySelector('[data-id="' + changed + '"]'); if (ce) ce.classList.add("flash-go"); }
    if (dur || solved.length) G.busy = true;
    res.events.forEach(function (ev) {
      if (ev.type === "zero" && !G.zeroSeen) {
        G.zeroSeen = true; $("declare").classList.add("ready");
        var r = E.rowById(G.st, ev.id);
        say(ev.kind === "none"
          ? "Row " + ev.id + " now reads " + mathText(E.rowText(r)) + ". Can that ever be true? If not, no combination opens this lock. Make the call under the vault."
          : "Row " + ev.id + " now reads " + mathText(E.rowText(r)) + ". That's true no matter how the dials are set. What does that tell you? Make the call under the vault.", "warn");
      }
    });
    if (!solved.length) renderCombo();
    var st = res.state;
    setTimeout(function () {
      if (!G || G.st !== st) return;
      G.busy = false;
      if (solved.length) {
        var rects = {};
        solved.forEach(function (ev) { var el = $("rows").querySelector('[data-id="' + ev.id + '"]'); if (el) rects[ev.id] = el.getBoundingClientRect(); });
        renderRows();
        solved.forEach(function (ev) { flyToDial(ev, rects[ev.id]); });
        G.busy = true;
        setTimeout(function () { if (G && G.st === st && !G.done) G.busy = false; }, 800);
      } else if (dur) renderRows();
      if (E.isWon(G.st)) { G.busy = true; setTimeout(function () { finishVault("one"); }, 1100); }
    }, dur + (solved.length ? 450 : 0));
    return true;
  }

  // ---- the result number animates: odometer ticks for adding, chunked counts for multiplying ----
  function val(p) { return p.n / p.d; }
  function tickSeq(a, b) {
    if (!E.isInt(a) || !E.isInt(b)) return [a, b];
    var diff = b.n - a.n, k = Math.min(Math.abs(diff), 12), out = [a];
    for (var i = 1; i <= k; i++) { var v = E.F(Math.round(a.n + diff * i / k)); if (!E.same(v, out[out.length - 1])) out.push(v); }
    return out;
  }
  // multiplying by 4: 3, 6, 9, 12 (adding groups). Dividing by 3: 12, 8, 4 (three groups of 4 down to one).
  function chunkSeq(a, b, m) {
    var out = [a];
    if (E.isInt(a) && E.isInt(b) && !E.isZ(a)) {
      var A = Math.abs(a.n), B = Math.abs(b.n), sa = a.n < 0 ? -1 : 1, i;
      var M = Math.abs(m.n), D = m.d, k;
      // up to 8 chunks; a big factor like 30 counts in even jumps
      if (E.isInt(m) && M >= 2) { k = Math.min(M, 8); for (i = 1; i <= k; i++) { var g = Math.round(M * i / k); if (g >= 2) out.push(E.F(sa * A * g)); } }
      else if (M === 1 && D >= 2) { k = Math.min(D - 1, 7); for (i = 1; i <= k; i++) out.push(E.F(sa * B * Math.round(D - (D - 1) * i / k))); }
      out = out.filter(function (p, j) { return j === 0 || !E.same(p, out[j - 1]); });
    }
    if (!E.same(out[out.length - 1], b)) out.push(b);
    return out;
  }
  function slotVal(r, sl) { return sl === "k" ? r.k : sl === "c" ? r.c : r.co[sl]; }
  function slotEl(rowEl, sl) { return rowEl.querySelector('[data-slot="' + sl + '"]'); }
  // how a term reads while it animates: "+3x", "−2", or the right side "−19"
  function termFmt(sl, first) {
    return function (p) {
      if (sl === "c") return signed(p);
      var sign = p.n < 0 ? "−" : first ? "" : "+";
      return (sign ? '<span class="op">' + sign + "</span>" : "") + num(E.abs(p)) + (sl === "k" ? "" : "<i>" + sl + "</i>");
    };
  }
  function animateResult(mv, oldRow, newRow) {
    if (!oldRow || !newRow) return 0;
    var rowEl = $("rows").querySelector('[data-id="' + newRow.id + '"]'); if (!rowEl) return 0;
    var paren = function (p) { return p.n < 0 ? "(" + signed(p) + ")" : num(p); };
    if (mv.type === "sub") return animateSub(rowEl, mv, oldRow);
    if (mv.type === "const" || mv.type === "div") {
      var el = slotEl(rowEl, "c"); if (!el) return 0;
      var seq = mv.type === "const" ? tickSeq(oldRow.c, newRow.c) : chunkSeq(oldRow.c, newRow.c, E.div(E.F(1), mv.a));
      if (seq.length < 2) return 0;
      return rollSeq(el, seq, mv.type === "const" ? "tick" : "chunk", mv.type === "const" ? (mv.k.n > 0 ? "− " : "+ ") + num(E.abs(mv.k)) : "÷ " + paren(mv.a));
    }
    if (mv.type !== "add" && mv.type !== "mul") return 0;
    // every term in the row moves at once: ticks when rows are added, chunks when a row is multiplied
    var kind = mv.type === "add" ? "tick" : "chunk", badge = mv.type === "mul" ? "× " + paren(mv.m) : "", longest = 0;
    var firstVar = G.v.vars.filter(function (v) { return !E.isZ(newRow.co[v]) || !E.isZ(oldRow.co[v]); })[0];
    G.v.vars.concat(["k", "c"]).forEach(function (sl) {
      var a = slotVal(oldRow, sl), b = slotVal(newRow, sl), el = slotEl(rowEl, sl);
      if (E.same(a, b) || !el) return;
      var seq = kind === "tick" ? tickSeq(a, b) : chunkSeq(a, b, mv.m);
      if (seq.length < 2) return;
      var d = rollSeq(el, seq, kind, sl === "c" ? badge : "", termFmt(sl, sl === firstVar), sl !== "c", null, sl !== "c" && badge ? 420 : 0);
      if (E.isZ(b) && sl !== "c") { el.classList.add("cancelling"); setTimeout(function () { el.classList.add("gone"); }, d + 120); d += 520; }
      longest = Math.max(longest, d);
    });
    return longest;
  }
  // a cracked value dropped on a letter: show 3(−1), multiply it out a group at a time, then slide it into the constant
  function animateSub(rowEl, mv, oldRow) {
    var v = mv.v, a = mv.co, val = mv.val, prod = E.mul(a, val), k0 = oldRow.k;
    var vEl = slotEl(rowEl, v), kEl = slotEl(rowEl, "k"); if (!vEl) return 0;
    var first = G.v.vars.filter(function (w) { return !E.isZ(oldRow.co[w]); })[0] === v;
    var sign = a.n < 0 ? "−" : first ? "" : "+";
    var start = (sign ? '<span class="op">' + sign + "</span>" : "") + (E.isOne(E.abs(a)) ? "" : num(E.abs(a))) + '<span class="subval">(' + signed(val) + ")</span>";
    if (kEl) kEl.innerHTML = E.isZ(k0) ? "" : termFmt("k", false)(k0);
    vEl.classList.add("subbing");
    // seq[0] is never shown (the start is "3(−1)"); then one group, two groups, three: −1, −2, −3
    var seq = [E.F(0)].concat(chunkSeq(val, prod, a));
    var d = rollSeq(vEl, seq, "chunk", "", termFmt("k", first), false, start, 700);
    vEl.animate([{ transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 320, easing: "cubic-bezier(.3,1.5,.5,1)" });
    // with no constant in the row yet, the product simply becomes the constant
    if (!kEl || E.isZ(k0)) return d + 250;
    // otherwise it merges into the constant that's already there, which ticks to the new total
    setTimeout(function () {
      if (!vEl.isConnected) return;
      var dx = kEl.getBoundingClientRect().left - vEl.getBoundingClientRect().left;
      vEl.animate([{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(" + dx + "px)", opacity: 0 }], { duration: 380, easing: "ease-in", fill: "forwards" });
      S.snap();
      setTimeout(function () { rollSeq(kEl, tickSeq(k0, E.add(k0, prod)), "tick", "", termFmt("k", false), false); }, 300);
    }, d + 150);
    return d + 150 + 300 + tickSeq(k0, E.add(k0, prod)).length * 110 + 300;
  }
  function rollSeq(el, seq, kind, badge, fmt, quiet, startHTML, delay) {
    fmt = fmt || signed;
    var n = seq.length - 1, durs = [], i;
    for (i = 1; i <= n; i++) durs.push(kind === "chunk" ? 330 : Math.round(Math.max(45, Math.min(110, 650 / n)) * (i > n - 3 ? 1 + (i - (n - 3)) * 0.45 : 1)));
    var lead = (badge ? 420 : 0) + (delay || 0), gap = kind === "chunk" ? 1.12 : 1;
    var total = lead + durs.reduce(function (x, y) { return x + y * gap; }, 0);
    el.innerHTML = '<span class="roll"><span class="rv">' + (startHTML || fmt(seq[0])) + "</span></span>";
    if (badge) {
      var bd = document.createElement("span"); bd.className = "opbadge"; bd.innerHTML = badge; el.appendChild(bd);
      bd.animate([{ transform: "translate(-50%,-150%) scale(1.1)", opacity: 0 }, { transform: "translate(-50%,-105%)", opacity: 1, offset: 0.3 },
        { transform: "translate(-50%,-105%)", opacity: 1, offset: 0.6 }, { transform: "translate(-50%,-10%) scale(.5)", opacity: 0 }], { duration: lead + 260, easing: "ease-in", fill: "forwards" });
    }
    var roll = el.firstChild, step = 1;
    function next() {
      if (!roll.isConnected) return;
      if (step > n) { el.innerHTML = fmt(seq[n]); return; }
      var p = seq[step - 1], c = seq[step], d = durs[step - 1], old = roll.lastElementChild, nw = document.createElement("span");
      nw.className = "rv"; nw.innerHTML = fmt(c); roll.appendChild(nw);
      var flip = Math.abs(val(p)) === Math.abs(val(c));
      var up = kind === "chunk" ? Math.abs(val(c)) > Math.abs(val(p)) : val(c) > val(p);
      if (flip) {
        old.animate([{ transform: "rotateX(0)" }, { transform: "rotateX(90deg)" }], { duration: d / 2, fill: "forwards" });
        nw.animate([{ transform: "rotateX(-90deg)" }, { transform: "rotateX(-90deg)", offset: 0.5 }, { transform: "rotateX(0)" }], { duration: d });
      } else {
        var sgn = up ? 1 : -1, ease = kind === "chunk" ? "cubic-bezier(.3,1.45,.5,1)" : "linear";
        old.animate([{ transform: "translateY(0)" }, { transform: "translateY(" + (-sgn * 110) + "%)" }], { duration: d, easing: ease, fill: "forwards" });
        nw.animate([{ transform: "translateY(" + (sgn * 110) + "%)" }, { transform: "translateY(0)" }], { duration: d, easing: ease });
      }
      setTimeout(function () { old.remove(); }, d);
      if (!quiet) { if (kind === "chunk") S.chunk(step); else S.roll(up); }
      step++; setTimeout(next, d * gap);
    }
    setTimeout(next, lead);
    return total;
  }
  // ---- by hand: after a move, the changed numbers become boxes the player fills in ----
  function calcSlots(mv, o, n, prev) {
    var out = [], w = E.wrap, st = E.str, slots = G.v.vars.concat(["k", "c"]);
    function put(sl, work, ans) { out.push({ slot: sl, work: work, ans: ans }); }
    if (mv.type === "const") put("c", st(o.c) + (mv.k.n > 0 ? " − " + st(mv.k) : " + " + st(E.abs(mv.k))), n.c);
    else if (mv.type === "div") { if (!E.isZ(o.k)) put("k", w(o.k) + " ÷ " + w(mv.a), n.k); put("c", w(o.c) + " ÷ " + w(mv.a), n.c); }
    else if (mv.type === "mul") slots.forEach(function (sl) { var a = slotVal(o, sl); if (!E.isZ(a)) put(sl, w(mv.m) + " × " + w(a), slotVal(n, sl)); });
    else if (mv.type === "add") { var src = E.rowById(prev, mv.src); slots.forEach(function (sl) { var p = slotVal(src, sl); if (!E.isZ(p)) put(sl, w(slotVal(o, sl)) + " + " + w(p), slotVal(n, sl)); }); }
    else if (mv.type === "sub") put("k", (E.isZ(o.k) ? "" : w(o.k) + " + ") + w(mv.co) + "(" + st(mv.val) + ")", n.k);
    return out;
  }
  function calcCell(sl, it) {
    return '<span class="cell calc' + (sl === "c" ? " rhs" : "") + '" data-slot="' + sl + '"><span class="work">' + esc(it.work) + '</span><span class="calc-in">' +
      '<input class="calcin" data-slot="' + sl + '" autocomplete="off" spellcheck="false" inputmode="text" aria-label="' + esc(it.work) + ' equals">' +
      (sl === "k" || sl === "c" ? "" : "<i>" + sl + "</i>") + "</span></span>";
  }
  function startCalc(res) {
    var prev = G.st, mv = res.move, changed = mv.type === "add" ? mv.tgt : mv.id;
    var oldRow = E.rowById(prev, changed), newRow = E.rowById(res.state, changed);
    if (!newRow) {
      var ev = res.events.filter(function (x) { return x.type === "solved" && x.id === changed; })[0]; if (!ev) return false;
      var co = { x: E.F(0), y: E.F(0), z: E.F(0) }; co[ev.v] = E.F(1);
      newRow = { id: changed, co: co, k: E.F(0), c: ev.value, kFirst: false, held: true };
    }
    var slots = oldRow ? calcSlots(mv, oldRow, newRow, prev) : [];
    if (!slots.length) return false;
    G.pend = { res: res, row: changed, slots: slots, map: {} };
    slots.forEach(function (x, i) { G.pend.map[x.slot] = i; });
    renderRows(changed, prev.rows.map(function (r) { return r.id === changed ? newRow : r; }));
    updateMeters(); S.drop();
    if (!G.calcTold) { G.calcTold = true; say("Now do the math. Type each new number, then press Enter."); }
    var first = $("rows").querySelector(".calcin"); if (first) first.focus();
    return true;
  }
  function checkCalc() {
    var P = G && G.pend; if (!P) return;
    var ins = Array.prototype.slice.call($("rows").querySelectorAll(".calcin")), bad = null;
    var empty = ins.filter(function (x) { return !x.value.trim(); })[0];
    if (empty) { empty.focus(); return; }
    ins.forEach(function (inp) {
      var v = E.parseNum(inp.value), ok = !!v && E.same(v, P.slots[P.map[inp.dataset.slot]].ans);
      inp.classList.toggle("bad", !ok); inp.classList.toggle("good", ok);
      if (!ok && !bad) bad = inp;
    });
    if (bad) {
      S.error(); bad.focus(); bad.select();
      G.calcMiss = (G.calcMiss || 0) + 1;
      if (G.calcMiss === 2) say("Check the sign as well as the arithmetic. Stuck? Tip fills in a box.", "warn");
      return;
    }
    S.coin(1);
    var res = P.res; G.pend = null; commitMove(res, false);
  }
  function tipCalc() {
    var P = G.pend;
    var target = Array.prototype.slice.call($("rows").querySelectorAll(".calcin")).filter(function (inp) {
      var v = E.parseNum(inp.value); return !v || !E.same(v, P.slots[P.map[inp.dataset.slot]].ans);
    })[0];
    if (!target) return checkCalc();
    var it = P.slots[P.map[target.dataset.slot]];
    target.value = E.str(it.ans).replace("−", "-"); target.classList.remove("bad"); target.classList.add("good");
    G.hint = true; $("tipBtn").classList.add("used");
    say(mathText(it.work + " = " + E.str(it.ans)) + ".");
    var next = Array.prototype.slice.call($("rows").querySelectorAll(".calcin")).filter(function (x) { return !x.value.trim(); })[0];
    (next || target).focus();
  }
  $("rows").addEventListener("keydown", function (e) {
    if (!e.target.classList.contains("calcin")) return;
    if (e.key === "Escape") { e.stopPropagation(); return; }
    if (e.key !== "Enter") return;
    e.preventDefault();
    var ins = Array.prototype.slice.call($("rows").querySelectorAll(".calcin")), i = ins.indexOf(e.target);
    var nextEmpty = ins.slice(i + 1).concat(ins.slice(0, i)).filter(function (x) { return !x.value.trim(); })[0];
    if (e.target.value.trim() && nextEmpty) nextEmpty.focus(); else checkCalc();
  });
  $("rows").addEventListener("input", function (e) { if (e.target.classList.contains("calcin")) e.target.classList.remove("bad", "good"); });

  function describe(m) {
    if (m.type === "mul") return "Multiplied every term in row " + m.id + " by " + E.str(m.m) + ".";
    if (m.type === "add") return "Added row " + m.src + " to row " + m.tgt + "." + (m.cancelled.length ? " <b>" + m.cancelled.join(" and ") + "</b> cancelled." : "");
    if (m.type === "const") return m.k.n < 0 ? "Added " + E.str(E.abs(m.k)) + " to both sides of row " + m.id + "." : "Subtracted " + E.str(m.k) + " from both sides of row " + m.id + ".";
    if (m.type === "div") return "Divided both sides of row " + m.id + " by " + E.str(m.a) + ".";
    if (m.type === "sub") {
      var co = E.isOne(m.co) ? "" : E.same(m.co, E.F(-1)) ? "−" : E.str(m.co);
      return "Put " + m.v + " = " + E.str(m.val) + " into row " + m.id + ": " + co + "(" + E.str(m.val) + ") became " + E.str(E.mul(m.co, m.val)) + ".";
    }
    return "";
  }
  function flyToDial(ev, from) {
    var dial = $("door").querySelector('.dial[data-v="' + ev.v + '"]');
    var fly = document.createElement("div");
    fly.className = "ghost"; fly.innerHTML = '<span class="tagchip static"><i>' + ev.v + "</i> = " + signed(ev.value) + "</span>";
    document.body.appendChild(fly);
    var fr = from || $("rows").getBoundingClientRect(), to = dial.getBoundingClientRect();
    var x0 = fr.left + fr.width / 2 - 60, y0 = fr.top + fr.height / 2 - 20, x1 = to.left + to.width / 2 - 60, y1 = to.top + to.height / 2 - 20;
    var anim = fly.animate([
      { transform: "translate(" + x0 + "px," + y0 + "px) scale(1.4)", opacity: 1 },
      { transform: "translate(" + (x0 + x1) / 2 + "px," + (Math.min(y0, y1) - 80) + "px) scale(1.2)", opacity: 1, offset: 0.5 },
      { transform: "translate(" + x1 + "px," + y1 + "px) scale(.7)", opacity: 0.2 }
    ], { duration: 750, easing: "cubic-bezier(.5,0,.3,1)" });
    anim.onfinish = function () {
      fly.remove(); if (!G) return;
      updateDoor(); renderCombo(); S.lock();
      say("Dial <b>" + ev.v + "</b> locked in at <b>" + E.str(ev.value) + "</b>.", "good");
    };
  }

  // ---- drag and drop ----
  var drag = null;
  function accepts(spec, zone) {
    var a = spec.split(":"), b = zone.split(":");
    if (a[0] === "row") return b[0] === "row" && a[1] !== b[1];
    if (a[0] === "const" || a[0] === "coef") return b[0] === "side" && a[1] === b[1];
    if (a[0] === "tag") return b[0] === "tag" && a[1] === b[1];
    return false;
  }
  function findZone(x, y) {
    // a number dragged anywhere past the = sign of its own row counts as dropped on the other side
    if (drag.flip && drag.flip.on) {
      var rowEl = $("rows").querySelector('[data-id="' + drag.spec.split(":")[1] + '"]'), rr = rowEl && rowEl.getBoundingClientRect();
      if (rr && y > rr.top - 40 && y < rr.bottom + 40 && x < rr.right + 80) return rowEl.querySelector(".rhs");
    }
    var el = document.elementFromPoint(x, y);
    while (el && el !== document.body) {
      if (el.dataset && el.dataset.drop && accepts(drag.spec, el.dataset.drop) && $("gameScreen").contains(el)) return el;
      el = el.parentElement;
    }
    return null;
  }
  document.addEventListener("pointerdown", function (e) {
    S.unlock(); clearGuide();
    if (G && G.pend) return;
    if (e.button !== 0 || !G || G.busy || G.done) return;
    var src = e.target.closest("[data-drag]");
    if (!src || !$("gameScreen").contains(src) || e.target.closest(".mulbtn")) return;
    closePop();
    drag = { spec: src.dataset.drag, src: src.classList.contains("grip") ? src.closest(".eqrow") : src, x0: e.clientX, y0: e.clientY, active: false, zone: null };
    e.preventDefault();
  });
  document.addEventListener("pointermove", function (e) {
    if (!drag) return;
    if (!drag.active) { if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return; beginDrag(); }
    drag.ghost.style.transform = "translate(" + (e.clientX - drag.ox) + "px," + (e.clientY - drag.oy) + "px)";
    if (drag.flip) {
      var crossed = e.clientX > drag.flip.x;
      if (crossed !== drag.flip.on) {
        drag.flip.on = crossed;
        var gc = drag.ghost.firstElementChild;
        gc.innerHTML = crossed ? drag.flip.alt : drag.flip.orig; gc.classList.toggle("flipped", crossed);
        gc.animate([{ transform: "rotateX(90deg)" }, { transform: "rotateX(0)" }], { duration: 220, easing: "ease-out" });
        S.snap();
      }
    }
    var z = findZone(e.clientX, e.clientY);
    if (z !== drag.zone) {
      if (drag.zone) { drag.zone.classList.remove("over"); var pv = drag.zone.querySelector(".preview"); if (pv) pv.remove(); }
      drag.zone = z;
      if (z) { z.classList.add("over"); S.pick(); if (drag.spec.indexOf("row:") === 0) showPreview(z); }
    }
  });
  function beginDrag() {
    drag.active = true;
    var r = drag.src.getBoundingClientRect(), g = document.createElement("div");
    g.className = "ghost"; g.innerHTML = drag.src.outerHTML; g.style.width = r.width + "px";
    g.querySelectorAll("[data-drop],[data-drag]").forEach(function (n) { n.removeAttribute("data-drop"); n.removeAttribute("data-drag"); });
    document.body.appendChild(g);
    drag.ghost = g; drag.ox = drag.x0 - r.left; drag.oy = drag.y0 - r.top; drag.rect = r;
    drag.src.classList.add("dragging");
    // a number dragged across the = sign changes to its inverse: +3 becomes −3, a coefficient 2 becomes ÷2
    var kind = drag.spec.split(":")[0];
    if (kind === "const" || kind === "coef") {
      var id = drag.spec.split(":")[1], r0 = E.rowById(G.st, id), eqs = $("rows").querySelector('[data-id="' + id + '"] .eqsign'), er = eqs.getBoundingClientRect();
      var alt;
      if (kind === "const") alt = '<span class="op">' + (r0.k.n > 0 ? "−" : "+") + "</span>" + num(E.abs(r0.k));
      else { var a0 = r0.co[E.varsIn(r0)[0]]; alt = '<span class="op">÷</span>' + (a0.n < 0 ? "(" + signed(a0) + ")" : num(a0)); }
      drag.flip = { x: er.left + er.width / 2, on: false, orig: g.firstElementChild.innerHTML, alt: alt };
    }
    $("gameScreen").querySelectorAll("[data-drop]").forEach(function (z) { if (accepts(drag.spec, z.dataset.drop)) z.classList.add("can-drop"); });
    S.pick();
  }
  function cleanupDrag(d) {
    d.src.classList.remove("dragging");
    document.querySelectorAll(".can-drop,.over").forEach(function (z) { z.classList.remove("can-drop", "over"); });
    document.querySelectorAll(".eqrow .preview").forEach(function (p) { p.remove(); });
  }
  document.addEventListener("pointerup", function (e) {
    if (!drag) return;
    var d = drag; drag = null;
    if (!d.active) { if (d.spec.indexOf("row:") === 0 && e.target.closest(".grip")) missTip("row"); return; }
    cleanupDrag(d);
    var z = d.zone, a = d.spec.split(":");
    if (!z) {
      var g = d.ghost;
      g.animate([{ transform: g.style.transform }, { transform: "translate(" + d.rect.left + "px," + d.rect.top + "px)" }], { duration: 220, easing: "ease-out" }).onfinish = function () { g.remove(); };
      missTip(a[0]);
      return;
    }
    d.ghost.remove();
    var b = z.dataset.drop.split(":"), res;
    if (a[0] === "row") res = E.opAdd(G.st, a[1], b[1]);
    else if (a[0] === "const") res = E.opConst(G.st, a[1]);
    else if (a[0] === "coef") res = E.opDiv(G.st, a[1]);
    else res = E.opSub(G.st, a[1], z.closest(".eqrow").dataset.id);
    doMove(res);
  });
  document.addEventListener("pointercancel", function () { if (drag) { if (drag.active) { cleanupDrag(drag); drag.ghost.remove(); } drag = null; } });
  function missTip(kind) {
    if (!G || G.missTold[kind]) return;
    G.missTold[kind] = true;
    say({
      row: "Drag the row and drop it onto a different row. The two rows get added together.",
      const: "Drop the number on the other side of the = sign, in the same row.",
      coef: "Drop the number on the other side of the = sign, in the same row. Both sides get divided by it.",
      tag: "Drop the tag on a matching letter in one of the rows."
    }[kind]);
  }
  function showPreview(zone) {
    var a = drag.spec.split(":")[1], b = zone.dataset.drop.split(":")[1], res = E.opAdd(G.st, a, b);
    if (res.error) return;
    var solved = res.events.filter(function (ev) { return ev.type === "solved"; })[0];
    var txt = solved ? solved.v + " = " + E.str(solved.value) : E.rowText(E.rowById(res.state, b));
    var p = document.createElement("div"); p.className = "preview";
    p.innerHTML = "<em>" + a + " + " + b + "</em> gives <span class=\"eqtxt\">" + esc(txt) + "</span>" + (res.move.cancelled.length ? " &middot; <em>" + res.move.cancelled.join(" and ") + " cancels</em>" : "");
    zone.appendChild(p);
  }

  // ---- multiply popover ----
  var popRow = null;
  $("rows").addEventListener("click", function (e) {
    if (G && G.pend) { if (e.target.closest("#calcGo")) checkCalc(); return; }
    var b = e.target.closest(".mulbtn"); if (!b || !G || G.done || G.busy) return;
    openPop(b.dataset.mul, b);
  });
  function openPop(id, anchor) {
    popRow = id;
    var p = $("popover"), r = anchor.getBoundingClientRect();
    $("mulLabel").textContent = "Multiply every term in row " + id + " by";
    $("mulIn").value = ""; $("mulErr").textContent = "";
    p.hidden = false;
    var w = p.offsetWidth, h = p.offsetHeight;
    p.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.right + 12)) + "px";
    p.style.top = Math.max(12, Math.min(innerHeight - h - 12, r.top - 12)) + "px";
    $("mulIn").focus();
  }
  function closePop() { $("popover").hidden = true; popRow = null; }
  function applyMul() {
    if (!popRow || !G) return;
    var m = E.parseNum($("mulIn").value);
    if (!m) { $("mulErr").textContent = "Type a whole number, a fraction like 1/2, or a decimal."; S.error(); return; }
    var res = E.opMul(G.st, popRow, m);
    if (res.error) { $("mulErr").textContent = res.error; S.error(); return; }
    closePop(); doMove(res);
  }
  $("mulGo").addEventListener("click", applyMul);
  $("mulIn").addEventListener("keydown", function (e) { if (e.key === "Enter") applyMul(); if (e.key === "Escape") closePop(); });
  document.addEventListener("mousedown", function (e) { if (!$("popover").hidden && !e.target.closest("#popover") && !e.target.closest(".mulbtn")) closePop(); });

  // ---- tips ----
  function tip() {
    if (!G || G.done || G.busy) return;
    if (G.pend) return tipCalc();
    var pl = E.plan(G.st); if (!pl.length) return;
    var mv = pl[0];
    G.hint = true; $("tipBtn").classList.add("used");
    say(tipText(mv));
    highlight(mv);
  }
  function tipText(mv) {
    var r = mv.id ? E.rowById(G.st, mv.id) : null;
    if (mv.type === "declare") return mv.kind === "none"
      ? "Row " + mv.id + " reads " + mathText(E.rowText(r)) + ". That can never be true, so no combination opens this lock. Call it: <b>Jammed</b>."
      : "Row " + mv.id + " reads " + mathText(E.rowText(r)) + ". That's true for every setting of the dials. Call it: <b>Any code</b>.";
    if (mv.type === "const") {
      var k = r.k, multi = E.varsIn(r).length > 1;
      return (multi ? "Row " + mv.id + " has a leftover number. " : "Get the variable alone. ") + "Drag the " + (k.n < 0 ? "−" + E.str(E.abs(k)) : E.str(k)) + " across the = sign. " +
        (k.n < 0 ? "That adds " + E.str(E.abs(k)) + " to both sides." : "That subtracts " + E.str(k) + " from both sides.");
    }
    if (mv.type === "div") { var a = r.co[mv.v]; return "<i>" + mv.v + "</i> is multiplied by " + E.str(a) + ". Drag the " + E.str(a) + " across the = sign to divide both sides by " + E.str(a) + "."; }
    if (mv.type === "sub") return "You know " + mv.v + " = " + E.str(G.st.solved[mv.v]) + ". Drag that tag onto the <i>" + mv.v + "</i> in row " + mv.id + ".";
    if (mv.type === "mul") return "Aim to cancel <i>" + mv.meta.v + "</i> between rows " + mv.meta.p + " and " + mv.meta.t + ". Multiply row " + mv.id + " by " + E.str(mv.m) + " with its × button so the <i>" + mv.meta.v + "</i> terms become opposites.";
    if (mv.type === "add") return "The <i>" + mv.meta.v + "</i> terms in rows " + mv.src + " and " + mv.tgt + " are opposites. Drag row " + mv.src + " onto row " + mv.tgt + " and <i>" + mv.meta.v + "</i> cancels.";
    return "";
  }
  function highlight(mv) {
    var q = [], row = function (id) { return $("rows").querySelector('[data-id="' + id + '"]'); };
    if (mv.type === "declare") q.push($("declare").querySelector('[data-declare="' + mv.kind + '"]'));
    if (mv.type === "const") q.push(row(mv.id).querySelector(".const"));
    if (mv.type === "div") q.push(row(mv.id).querySelector(".coef"));
    if (mv.type === "sub") { q.push($("combo").querySelector('[data-drag="tag:' + mv.v + '"]')); q.push(row(mv.id).querySelector('[data-drop="tag:' + mv.v + '"]')); }
    if (mv.type === "mul") q.push(row(mv.id).querySelector(".mulbtn"));
    if (mv.type === "add") { q.push(row(mv.src).querySelector(".grip")); q.push(row(mv.tgt)); }
    q.forEach(function (el) { if (!el) return; el.classList.remove("hl"); void el.offsetWidth; el.classList.add("hl"); setTimeout(function () { el.classList.remove("hl"); }, 4600); });
    var r0 = mv.id ? row(mv.id) : null;
    if (mv.type === "const") handGuide(r0.querySelector(".const"), r0.querySelector(".rhs"));
    else if (mv.type === "div") handGuide(r0.querySelector(".coef"), r0.querySelector(".rhs"));
    else if (mv.type === "sub") handGuide(q[0], q[1]);
    else if (mv.type === "add") handGuide(row(mv.src).querySelector(".grip"), row(mv.tgt));
    else handGuide(q[0]);
  }

  // ---- calling a rigged lock ----
  $("declare").addEventListener("click", function (e) {
    var b = e.target.closest("[data-declare]"); if (!b || !G || G.done || G.busy || G.pend) return;
    var kind = b.dataset.declare;
    if (kind === G.v.kind) {
      G.st = Object.assign({}, G.st, { moves: G.st.moves + 1 });
      G.log.push({ mv: { type: "declare", kind: kind }, st: G.st, t: Date.now() - G.t0 });
      updateMeters(); finishVault(kind); return;
    }
    G.alarms++; updateMeters(); S.alarm();
    b.classList.add("shake"); setTimeout(function () { b.classList.remove("shake"); }, 600);
    say(G.v.kind === "one" ? "Wrong call. This lock has exactly one combination. Keep working it."
      : "Wrong call. Look at the row that lost all its variables. Is it true, or impossible?", "warn");
    if (G.alarms >= 3) setTimeout(function () { bust("alarm"); }, 700);
  });

  // ---- the payoff ----
  function finishVault(kind) {
    G.done = true; G.busy = true; stopTimer(); closePop(); updateMeters();
    var door = $("door");
    if (kind === "none") {
      S.clunk(0); S.error();
      var j = document.createElement("div"); j.className = "jam"; j.textContent = "JAMMED"; door.appendChild(j);
      setTimeout(function () { showResult(kind); }, 1300);
      return;
    }
    if (kind === "inf") door.querySelectorAll(".dial").forEach(function (d) { d.classList.add("solved"); d.querySelector(".readout").textContent = "ANY"; });
    setTimeout(function () { door.classList.add("unlocked"); S.clunk(0); S.clunk(0.18); }, 250);
    setTimeout(function () { door.classList.add("spin"); S.tick(16); }, 800);
    setTimeout(function () { door.classList.add("open"); S.whoosh(); }, 1800);
    setTimeout(function () { showResult(kind); }, 3500);
  }
  function showResult(kind) {
    if (!G) return;
    var f = G.f, l = G.l, hand = G.hand, earned = [true, G.st.moves <= G.v.par, !G.hint], stars = earned.filter(Boolean).length;
    var loot = lootFor(f, l, stars, hand), prev = best(f, l, hand), firstBoss = l === BOSS && !prev && !hand;
    var better = !prev || stars > prev.stars || loot > prev.loot;
    if (better) save.best[bkey(f, l, hand)] = { stars: Math.max(stars, prev ? prev.stars : 0), loot: Math.max(loot, prev ? prev.loot : 0) };
    persist(); renderStats("game");
    var title = kind === "none" ? "Called it" : kind === "inf" ? "Skeleton key" : "Cracked";
    var line = kind === "none" ? "No combination could ever open this lock, and you proved it."
      : kind === "inf" ? "The rows all said the same thing, so endless combinations work. The door swings open."
      : "Every dial is set. The door is open.";
    var labels = [["Cracked", kind === "one" ? "Opened the lock" : "Made the right call"], ["Clean job", plural(G.st.moves, "move") + ", par " + G.v.par], ["No tips", G.hint ? "Used the Inside Man" : "Did it solo"]];
    var hasNext = l < BOSS ? true : f < 3 && unlocked(f + 1, 0, hand);
    var nf = l < BOSS ? f : f + 1, nl = l < BOSS ? l + 1 : 0;
    var h = '<div class="result-stamp' + (kind === "none" ? " bad" : "") + '">' + title + "</div>" +
      '<div class="slang">' + SLANG[Math.floor(Math.random() * SLANG.length)] + "</div><p>" + line + "</p>" +
      '<div class="result-stars">' + labels.map(function (x, i) { return '<div class="rs' + (earned[i] ? " earn" : "") + '">' + A.star(earned[i], 56) + "<b>" + x[0] + "</b>" + x[1] + "</div>"; }).join("") + "</div>" +
      '<div class="ledger"><span>Loot from this box</span><b>' + money(loot) + "</b><span>Best for this box</span><b>" + money(save.best[bkey(f, l, hand)].loot) + '</b><span>Total haul</span><b class="total">' + money(haul()) + "</b></div>" +
      (firstBoss ? '<p><b style="color:var(--ink)">By hand</b> is now open on this floor: do the arithmetic yourself for 1.5\u00d7 the loot.</p>' : "") +
      (firstBoss && f < 3 ? '<p>The stairs are open. <b style="color:var(--ink)">' + FLOORS[f].name + "</b> is waiting below.</p>" : "") +
      (firstBoss && f === 3 ? '<p><b style="color:var(--ink)">You emptied the Deep Vault.</b> Go back and chase three stars on every box.</p>' : "") +
      '<div class="modal-actions">' + (hasNext ? '<button class="btn brass" id="rNext">' + (l === BOSS ? "Head downstairs" : "Next box") + A.icon("next", 18) + "</button>" : "") +
      '<button class="btn" id="rWork">' + A.icon("file", 18) + "Show work</button>" +
      '<button class="btn" id="rAgain">' + A.icon("replay", 18) + "New lock, same box</button>" +
      '<button class="btn" id="rMap">' + A.icon("floors", 18) + "Floors</button></div>";
    openModal(h);
    $("rWork").onclick = function () { openCaseFile(); };
    S.fanfare();
    document.querySelectorAll(".result-stars .rs").forEach(function (el, i) {
      setTimeout(function () { el.classList.add("show"); if (earned[i]) S.coin(i); }, 450 + i * 380);
    });
    if (hasNext) $("rNext").onclick = function () { startVault(nf, nl, hand); };
    $("rAgain").onclick = function () { startVault(f, l, hand); };
    $("rMap").onclick = function () { closeModal(); renderMap(); };
    (hasNext ? $("rNext") : $("rAgain")).focus();
  }
  function bust(reason) {
    if (!G) return;
    G.done = true; G.busy = true; stopTimer(); closePop(); updateMeters(); S.alarm();
    var f = G.f, l = G.l, hand = G.hand;
    openModal('<div class="result-stamp bad">Busted</div><p style="margin-top:18px">' +
      (reason === "timer" ? "The guard came back before the vault was open." : "Three wrong calls tripped the alarm.") +
      " Every heist gets a fresh lock, so shake it off and go again.</p>" +
      '<div class="modal-actions"><button class="btn brass" id="rAgain">' + A.icon("replay", 18) + 'Try again</button><button class="btn" id="rMap">' + A.icon("floors", 18) + "Floors</button></div>");
    $("rAgain").onclick = function () { startVault(f, l, hand); };
    $("rMap").onclick = function () { closeModal(); renderMap(); };
    $("rAgain").focus();
  }

  // ---- modals and settings ----
  function openModal(html) { $("modalBody").innerHTML = html; $("modal").hidden = false; }
  function closeModal() { clearDemo(); $("modal").hidden = true; $("modalBody").innerHTML = ""; delete $("modalBody").dataset.kind; $("modalBody").classList.remove("wide"); }
  function openSettings() {
    var s = save.settings;
    function sw(id, on, title, sub) {
      return '<div class="setting"><div><b>' + title + "</b><p>" + sub + '</p></div><label class="switch"><input type="checkbox" id="' + id + '"' + (on ? " checked" : "") + ' aria-label="' + title + '"><span></span></label></div>';
    }
    openModal("<h2>Settings</h2>" +
      sw("setSound", s.sound, "Sound effects", "Dial clicks, bolts and alarms.") +
      sw("setTimers", s.timers, "Boss timers", "A countdown on each floor's boss vault. Applies to the next heist.") +
      sw("setUnlock", s.unlockAll, "Unlock every floor", "For teachers who want to jump straight to 2×2 or 3×3 systems.") +
      '<div class="setting"><div><b>Reset progress</b><p id="resetNote">Erase all stars and loot saved in this browser.</p></div><button class="btn" id="resetBtn">Reset</button></div>' +
      '<div class="modal-actions" style="margin-top:20px"><button class="btn brass" id="setDone">Done</button></div>');
    $("setSound").onchange = function () { s.sound = this.checked; S.setOn(s.sound); persist(); renderSound(); };
    $("setTimers").onchange = function () { s.timers = this.checked; persist(); };
    $("setUnlock").onchange = function () { s.unlockAll = this.checked; persist(); };
    $("resetBtn").onclick = function () {
      if (this.dataset.armed) { save.best = {}; persist(); $("resetNote").textContent = "Progress erased."; this.textContent = "Reset"; delete this.dataset.armed; return; }
      this.dataset.armed = "1"; this.textContent = "Erase everything"; $("resetNote").textContent = "Click again to erase every star and dollar. This can't be undone.";
    };
    $("setDone").onclick = function () { closeModal(); if (!G) renderMap(); };
    $("setDone").focus();
  }


  // ---- the case file: "show your work", recopying the system after every move ----
  var cfTimers = [];
  function cfMath(t) { return esc(t).replace(/([xyz])(?![a-z])/g, "<i>$1</i>"); }
  function cfClock(ms) { var t = Math.round(ms / 1000); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); }
  function cfNote(mv, prev) {
    var w = E.wrap, s = E.str;
    if (mv.type === "mul") return "× " + w(mv.m) + " on row " + mv.id;
    if (mv.type === "add") return mv.src + " + " + mv.tgt + " → row " + mv.tgt + (mv.cancelled.length ? " · " + mv.cancelled.join(" and ") + " cancels" : "");
    if (mv.type === "const") return (mv.k.n > 0 ? "− " + s(mv.k) : "+ " + s(E.abs(mv.k))) + " on both sides of row " + mv.id;
    if (mv.type === "div") return "÷ " + w(mv.a) + " on both sides of row " + mv.id;
    if (mv.type === "sub") return mv.v + " = " + s(mv.val) + " into row " + mv.id + ": " + w(mv.co) + "(" + s(mv.val) + ") = " + s(E.mul(mv.co, mv.val));
    if (mv.type === "declare") return mv.kind === "none" ? "Called it: Jammed. No combination works." : "Called it: Any code. Endless combinations work.";
    return "";
  }
  function cfSystem(st, changed, prevSolved) {
    var rows = st.rows.map(function (r) {
      return '<div class="cf-row' + (r.id === changed ? " chg" : "") + '"><span class="cf-id">' + r.id + '</span><span class="cf-eq">' + cfMath(E.rowText(r)) + "</span></div>";
    }).join("");
    var locks = Object.keys(st.solved).sort().map(function (v) {
      var fresh = !prevSolved || !prevSolved[v];
      return '<span class="cf-lock' + (fresh ? " fresh" : "") + '">' + A.icon("lock", 13) + "<i>" + v + "</i> = " + E.str(st.solved[v]) + "</span>";
    }).join("");
    return '<div class="cf-sys">' + rows + "</div>" + (locks ? '<div class="cf-locks">' + locks + "</div>" : "");
  }
  // the steps of a job: [{ mv, st, t }] after the starting position
  function cfSteps(entries, withTime) {
    var h = '<li class="cf-step"><div class="cf-meta"><b>Start</b>' + (withTime ? "<span>0:00</span>" : "") + '</div><div class="cf-body"><span class="cf-chip start">The lock</span>' + cfSystem(G.v.state, null, null) + "</div></li>";
    var prev = G.v.state;
    entries.forEach(function (e, i) {
      var chg = e.mv.type === "add" ? e.mv.tgt : e.mv.id;
      h += '<li class="cf-step"><div class="cf-meta"><b>Move ' + (i + 1) + "</b>" + (withTime ? "<span>" + cfClock(e.t) + "</span>" : "") + "</div>" +
        '<div class="cf-body"><span class="cf-chip' + (e.mv.type === "declare" ? " call" : "") + '">' + cfMath(cfNote(e.mv, prev)) + (e.hand ? ' <em>worked by hand</em>' : "") + "</span>" +
        (e.mv.type === "declare" ? "" : cfSystem(e.st, chg, prev.solved)) + "</div></li>";
      prev = e.st;
    });
    return h;
  }
  // the Inside Man's par route from the starting position
  function proRoute() {
    var st = E.clone(G.v.state), out = [], guard = 0;
    while (guard++ < 60 && !E.isWon(st)) {
      var pl = E.plan(st); if (!pl.length) break;
      if (pl[0].type === "declare") { out.push({ mv: { type: "declare", kind: pl[0].kind }, st: st }); break; }
      for (var i = 0; i < pl.length; i++) { var r = E.apply(st, pl[i]); st = r.state; out.push({ mv: r.move, st: st }); }
    }
    return out;
  }
  function cfText(entries) {
    var lines = ["Crack the Vault, box " + boxName(G.f, G.l) + (G.hand ? " (by hand)" : ""), "", "Start:"];
    G.v.state.rows.forEach(function (r) { lines.push("  " + r.id + ":  " + E.rowText(r)); });
    var prev = G.v.state;
    entries.forEach(function (e, i) {
      lines.push("", "Move " + (i + 1) + ": " + cfNote(e.mv, prev));
      if (e.mv.type !== "declare") {
        e.st.rows.forEach(function (r) { lines.push("  " + r.id + ":  " + E.rowText(r)); });
        Object.keys(e.st.solved).sort().forEach(function (v) { lines.push("  " + v + " = " + E.str(e.st.solved[v])); });
      }
      prev = e.st;
    });
    return lines.join("\n").replace(/−/g, "-");
  }
  function openCaseFile(tab) {
    if (!G) return;
    closePop(); clearCf();
    tab = tab || "mine";
    var route = G.done ? proRoute() : null, mine = tab === "mine", entries = mine ? G.log : route;
    var tabs = route ? '<div class="cf-tabs" role="tablist"><button role="tab" data-cftab="mine" aria-selected="' + mine + '" class="' + (mine ? "on" : "") + '">Your work &middot; ' + plural(G.log.length, "move") + "</button>" +
      '<button role="tab" data-cftab="pro" aria-selected="' + !mine + '" class="' + (mine ? "" : "on") + '">Inside Man\'s route &middot; ' + plural(route.length, "move") + "</button></div>" : "";
    $("fileBody").innerHTML = '<div class="cf-head"><div><small>Case file &middot; Box ' + boxName(G.f, G.l) + (G.hand ? " &middot; By hand" : "") + "</small><h2>" + (mine ? "Show your work" : "The Inside Man's route") + "</h2></div>" +
      '<div class="cf-actions"><button class="btn" id="cfReplay">' + A.icon("replay", 18) + 'Replay</button><button class="btn" id="cfCopy">' + A.icon("file", 18) + 'Copy as text</button>' +
      '<button class="tool icon-only" id="cfClose" aria-label="Close">' + A.icon("times", 18) + "</button></div></div>" + tabs +
      (route ? '<p class="cf-compare">' + (G.log.length < route.length ? "You beat the Inside Man's route by " + plural(route.length - G.log.length, "move") + "."
        : G.log.length === route.length ? "You matched the Inside Man: same number of moves."
        : "The Inside Man needed " + plural(G.log.length - route.length, "fewer move") + ". Compare the two tabs to spot where.") + "</p>" : "") +
      '<ol class="cf-steps" id="cfSteps">' + cfSteps(entries, mine) + "</ol>" +
      (mine && !G.log.length ? '<p class="cf-empty">No moves yet. Each move you make shows up here, recopied like written work.</p>' : "") +
      '<textarea class="cf-copybox" id="cfCopyBox" readonly hidden aria-label="Your work as text"></textarea><div class="cf-note" id="cfNote"></div>';
    $("filePanel").hidden = false;
    $("cfClose").onclick = closeCaseFile;
    $("cfReplay").onclick = replayCf;
    $("cfCopy").onclick = function () {
      var txt = cfText(entries), box = $("cfCopyBox");
      function fallback() { box.hidden = false; box.value = txt; box.focus(); box.select(); $("cfNote").textContent = "Select all and copy the text above."; }
      try {
        navigator.clipboard.writeText(txt).then(function () { $("cfNote").textContent = "Copied. Paste it into your assignment."; }, fallback);
      } catch (e) { fallback(); }
    };
    $("fileBody").querySelectorAll("[data-cftab]").forEach(function (b) { b.onclick = function () { openCaseFile(b.dataset.cftab); }; });
    $("cfClose").focus();
  }
  function clearCf() { cfTimers.forEach(clearTimeout); cfTimers = []; }
  function replayCf() {
    clearCf();
    var steps = $("cfSteps").querySelectorAll(".cf-step");
    steps.forEach(function (st) { st.classList.add("waiting"); st.classList.remove("shown"); });
    steps.forEach(function (st, i) {
      cfTimers.push(setTimeout(function () {
        st.classList.remove("waiting"); st.classList.add("shown");
        st.scrollIntoView({ block: "nearest", behavior: "smooth" });
        S.snap();
      }, 300 + i * 900));
    });
  }
  function closeCaseFile() { clearCf(); $("filePanel").hidden = true; $("fileBody").innerHTML = ""; }
  $("filePanel").addEventListener("click", function (e) { if (e.target === $("filePanel")) closeCaseFile(); });
  $("workBtn").addEventListener("click", function () { if (G && !G.busy) openCaseFile(); });

  // ---- wiring ----
  $("tipBtn").addEventListener("click", tip);
  $("undoBtn").addEventListener("click", function () {
    if (G && G.pend && !G.done) { G.pend = null; renderRows(); updateMeters(); S.snap(); say("Took back that move.", "log"); return; }
    if (!G || !G.hist.length || G.done || G.busy) return;
    G.st = G.hist.pop(); G.log.pop();
    renderRows(); renderCombo(); updateDoor(); updateMeters(); S.snap();
    if (!G.st.rows.some(function (r) { return E.zeroKind(r); })) $("declare").classList.remove("ready");
    say("Undid the last move.", "log");
  });
  // leaving a lock: ask first if there are moves on it, since an unfinished lock isn't saved
  function leaveVault() {
    if (!G) return;
    if (G.done || !G.st.moves) return renderMap();
    closePop();
    openModal("<h2>Leave this box?</h2><p>Your moves on this lock won't be saved. Next time you'll get a fresh lock.</p>" +
      '<div class="modal-actions"><button class="btn brass" id="stayBtn">Keep cracking</button><button class="btn" id="leaveBtn">' + A.icon("back", 18) + "Leave</button></div>");
    $("modalBody").dataset.kind = "confirm";
    $("stayBtn").onclick = closeModal;
    $("leaveBtn").onclick = function () { closeModal(); renderMap(); };
    $("stayBtn").focus();
  }
  $("exitBtn").addEventListener("click", leaveVault);
  $("brand").addEventListener("click", function () { if (G) leaveVault(); });
  $("settingsBtn").addEventListener("click", openSettings);
  $("soundBtn").addEventListener("click", function () { save.settings.sound = !save.settings.sound; S.setOn(save.settings.sound); persist(); renderSound(); if (save.settings.sound) S.snap(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (!$("filePanel").hidden) closeCaseFile();
      else if (!$("popover").hidden) closePop();
      else if (!$("modal").hidden) { if (!G || $("modalBody").dataset.kind === "confirm") closeModal(); }
      else if (G) leaveVault();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "z" && G && $("modal").hidden) { e.preventDefault(); $("undoBtn").click(); }
  });

  $("defs").innerHTML = A.defs();
  S.setOn(save.settings.sound);
  renderMap();
  if (!save.seen.intro) { save.seen.intro = true; persist(); openIntro(0); }
  window.CTV = { start: startVault, state: function () { return G; }, map: renderMap };
})();
