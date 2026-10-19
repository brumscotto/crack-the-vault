// Crack the Vault: the opening scene for first-time visitors.
// Five scenes: the title card outside the bank, the Inside Man's call, a practice lock
// the player cracks for real, the three floors, and how scoring works.
(function (root) {
  "use strict";
  var A = root.Art, S = root.Sfx;
  var el, onDone, timers = [], scene = 0, N = 5, HX = 21, HY = 3, demo = null;

  function q(s) { return el.querySelector(s); }
  function later(ms, fn) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clear() { timers.forEach(clearTimeout); timers = []; stopDemo(); }
  function fmt(n) { return (n < 0 ? "−" : "") + Math.abs(n); }

  function play(done) {
    onDone = done; el = document.getElementById("introRoot");
    el.className = "intro-root";
    el.innerHTML = '<div class="io-bg">' + A.bank() + '<div class="io-rain"></div><div class="io-shade"></div></div>' +
      '<div class="io-top"><div class="io-dots" aria-hidden="true"></div><button class="io-skip" id="ioSkip">Skip intro</button></div>' +
      '<div class="io-stage" id="ioStage"></div>';
    el.hidden = false;
    q("#ioSkip").onclick = function () { finish("map"); };
    document.addEventListener("keydown", onKey);
    show(0);
  }
  function onKey(e) { if (e.key === "Escape" && el && !el.hidden) finish("map"); }
  function show(i) {
    clear(); scene = i;
    el.classList.toggle("inside", i > 0);
    q("#ioStage").classList.toggle("title-scene", i === 0);
    var dots = ""; for (var d = 0; d < N; d++) dots += '<span class="' + (d === i ? "on" : d < i ? "past" : "") + '"></span>';
    q(".io-dots").innerHTML = dots;
    var stage = q("#ioStage");
    stage.classList.remove("in"); void stage.offsetWidth;
    stage.innerHTML = SCENES[i].html();
    stage.classList.add("in");
    SCENES[i].run();
  }
  function next() { show(scene + 1); }
  function finish(choice) {
    clear(); document.removeEventListener("keydown", onKey);
    el.classList.add("leaving");
    setTimeout(function () { el.hidden = true; el.innerHTML = ""; el.className = "intro-root"; if (onDone) onDone(choice); }, 450);
  }

  // ---- typewriter radio lines ----
  function typeLines(box, lines, done) {
    var li = 0, finished = false;
    function all() {
      if (finished) return; finished = true; clear();
      box.innerHTML = lines.map(function (t, i) { return '<p class="io-line">' + (i ? "" : '<b class="who">Inside Man</b>') + t + "</p>"; }).join("");
      done();
    }
    function line() {
      if (li >= lines.length) { finished = true; done(); return; }
      var p = document.createElement("p"); p.className = "io-line typing";
      p.innerHTML = li ? "" : '<b class="who">Inside Man</b>';
      var span = document.createElement("span"); p.appendChild(span); box.appendChild(p);
      var text = lines[li], ci = 0;
      S.static();
      (function ch() {
        if (ci >= text.length) { p.classList.remove("typing"); li++; later(420, line); return; }
        span.textContent += text.charAt(ci++);
        if (ci % 3 === 0) S.key();
        later(26, ch);
      })();
    }
    later(500, line);
    return all;
  }

  // ---- a draggable term in the practice lock ----
  function draggable(chip, onDrop) {
    var eqs = q("#ioEqS"), sx = 0, sy = 0, crossed = false, orig = chip.innerHTML, alt = chip.dataset.alt, active = false;
    function line() { var r = eqs.getBoundingClientRect(); return r.left + r.width / 2; }
    chip.addEventListener("pointerdown", function (e) {
      e.preventDefault(); stopDemo(); S.unlock(); S.pick();
      active = true; sx = e.clientX; sy = e.clientY; chip.setPointerCapture(e.pointerId); chip.classList.add("lift");
    });
    chip.addEventListener("pointermove", function (e) {
      if (!active) return;
      chip.style.transform = "translate(" + (e.clientX - sx) + "px," + (e.clientY - sy) + "px)";
      var c = e.clientX > line();
      if (c !== crossed) {
        crossed = c; chip.innerHTML = c ? alt : orig; chip.classList.toggle("flipped", c);
        chip.animate([{ transform: chip.style.transform + " rotateX(90deg)" }, { transform: chip.style.transform }], { duration: 200 });
        S.snap();
      }
    });
    function up() {
      if (!active) return; active = false; chip.classList.remove("lift");
      if (crossed) { onDrop(); return; }
      chip.animate([{ transform: chip.style.transform }, { transform: "translate(0,0)" }], { duration: 220, easing: "ease-out" });
      chip.style.transform = ""; later(1400, function () { startDemo(chip); });
    }
    chip.addEventListener("pointerup", up);
    chip.addEventListener("pointercancel", up);
  }
  // the hand shows the drag, over and over, until the player tries it
  function startDemo(chip) {
    stopDemo();
    var hand = q("#ioHand"), box = q(".io-practice"), rhs = q("#ioR");
    if (!hand || !chip || !rhs) return;
    function rel(elm) { var b = box.getBoundingClientRect(), r = elm.getBoundingClientRect(); return [r.left - b.left + r.width / 2, r.top - b.top + r.height / 2]; }
    var p = rel(chip), rr = rhs.getBoundingClientRect(), t = [rel(rhs)[0] + rr.width / 2 + 56, p[1]];
    function T(x, y, s) { return "translate(" + (x - HX) + "px," + (y - HY) + "px) scale(" + s + ")"; }
    demo = hand.animate([
      { transform: T(p[0] + 40, p[1] + 90, 1), opacity: 0 }, { transform: T(p[0], p[1], 1), opacity: 1, offset: 0.22 },
      { transform: T(p[0], p[1], 0.85), opacity: 1, offset: 0.32 }, { transform: T(t[0], t[1], 0.85), opacity: 1, offset: 0.72 },
      { transform: T(t[0], t[1], 1), opacity: 1, offset: 0.82 }, { transform: T(t[0], t[1], 1), opacity: 0 }
    ], { duration: 2600, iterations: Infinity, easing: "ease-in-out", delay: 500, fill: "backwards" });
  }
  function stopDemo() { if (demo) { demo.cancel(); demo = null; } var h = el && el.querySelector("#ioHand"); if (h) h.style.opacity = 0; }

  // a number rolls through its values: ticks for adding, chunks for dividing
  function roll(elm, seq, chunk, done) {
    var i = 1, ms = chunk ? 340 : 110;
    elm.innerHTML = '<span class="roll"><span class="rv">' + fmt(seq[0]) + "</span></span>";
    var r = elm.firstChild;
    (function step() {
      if (i >= seq.length) { elm.textContent = fmt(seq[seq.length - 1]); if (done) done(); return; }
      var old = r.lastElementChild, nw = document.createElement("span"), up = chunk ? Math.abs(seq[i]) > Math.abs(seq[i - 1]) : seq[i] > seq[i - 1], s = up ? 1 : -1;
      nw.className = "rv"; nw.textContent = fmt(seq[i]); r.appendChild(nw);
      var ease = chunk ? "cubic-bezier(.3,1.45,.5,1)" : "linear";
      old.animate([{ transform: "translateY(0)" }, { transform: "translateY(" + (-s * 110) + "%)" }], { duration: ms, easing: ease, fill: "forwards" });
      nw.animate([{ transform: "translateY(" + (s * 110) + "%)" }, { transform: "translateY(0)" }], { duration: ms, easing: ease });
      later(ms, function () { old.remove(); });
      if (chunk) S.chunk(i); else S.roll(up);
      i++; later(ms * (chunk ? 1.15 : 1), step);
    })();
  }

  var SCENES = [
    { // 1. outside the bank
      html: function () {
        return '<div class="io-title"><small>A heist in three floors</small><h1>Crack the <span>Vault</span></h1>' +
          "<p>Every lock in this bank is an equation.<br>Its solution is the combination.</p>" +
          '<button class="btn brass big" id="ioGo">Start the job' + A.icon("next", 20) + "</button></div>";
      },
      run: function () { q("#ioGo").onclick = function () { S.unlock(); S.clunk(0); next(); }; q("#ioGo").focus(); }
    },
    { // 2. the call
      html: function () {
        return '<div class="io-radio"><div class="io-radio-icon">' + A.icon("radio", 40) + '</div><div><div class="io-lines" id="ioLines"></div>' +
          '<button class="btn brass" id="ioNext" hidden>Show me' + A.icon("next", 18) + "</button></div></div>";
      },
      run: function () {
        var btn = q("#ioNext");
        var skip = typeLines(q("#ioLines"), [
          "You're in. The guards just changed shifts.",
          "Every safe in this bank opens with algebra.",
          "Solve for the unknown and you've got the combination.",
          "Let's crack a practice lock first."
        ], function () { btn.hidden = false; btn.focus(); });
        q(".io-radio").addEventListener("click", function (e) { if (btn.hidden && !e.target.closest("button")) skip(); });
        btn.onclick = next;
      }
    },
    { // 3. the practice lock
      html: function () {
        return '<div class="io-practice"><p class="io-say" id="ioSay">Get <i>x</i> alone. Drag the <b>+5</b> across the = sign.</p>' +
          '<div class="io-bench"><div class="io-eq" id="ioEq"></div>' + A.miniDial("x", "? ? ?", false) + "</div>" +
          '<button class="btn brass" id="ioNext" hidden>Next' + A.icon("next", 18) + "</button>" +
          '<div class="hand" id="ioHand">' + A.hand() + "</div></div>";
      },
      run: function () {
        var eq = q("#ioEq"), say = q("#ioSay");
        eq.innerHTML = '<span class="io-t" id="ioC">3</span><i>x</i><span class="io-t drag" id="ioK" data-alt="&minus; 5">+ 5</span><span class="io-eqs" id="ioEqS">=</span><span class="io-t" id="ioR">26</span>';
        later(400, function () { startDemo(q("#ioK")); });
        draggable(q("#ioK"), function () {
          S.drop();
          eq.innerHTML = '<span class="io-t drag" id="ioC" data-alt="&divide; 3">3</span><i>x</i><span class="io-eqs" id="ioEqS">=</span><span class="io-t" id="ioR">26</span>';
          roll(q("#ioR"), [26, 25, 24, 23, 22, 21], false, function () {
            say.innerHTML = "26 &minus; 5 = 21. Now drag the <b>3</b> across to divide.";
            draggable(q("#ioC"), function () {
              S.drop();
              eq.innerHTML = '<i class="ok">x</i><span class="io-eqs" id="ioEqS">=</span><span class="io-t ok" id="ioR">21</span>';
              roll(q("#ioR"), [21, 14, 7], true, function () {
                var dial = q(".dial"); dial.classList.add("solved"); dial.querySelector(".readout").textContent = "7";
                dial.querySelector(".ring").style.transform = "rotate(" + (-7 * 18 - 360) + "deg)";
                S.lock();
                say.innerHTML = "Cracked. Whatever you do to one side, do to the other.";
                later(900, function () { var b = q("#ioNext"); b.hidden = false; b.onclick = next; b.focus(); });
              });
            });
            later(300, function () { startDemo(q("#ioC")); });
          });
        });
      }
    },
    { // 4. the building
      html: function () {
        return '<div class="io-panel"><h2>Three floors. Each one harder.</h2><div class="io-floors">' + [
          ["Ground floor", "Lockbox Lobby", "1 unknown", "3<i>x</i> &minus; 2 = 19"],
          ["Basement", "The Twin Safes", "2 unknowns", "<i>x</i> + <i>y</i> = 7<br><i>x</i> &minus; <i>y</i> = 1"],
          ["Sub-basement", "The Deep Vault", "3 unknowns", "<i>x</i> + <i>y</i> + <i>z</i> = 6<br>&hellip;"]
        ].map(function (r, i) {
          return '<div class="io-floor" style="animation-delay:' + (0.3 + i * 0.45) + 's">' + A.safe("closed", i === 2) + "<div><small>" + r[0] + "</small><b>" + r[1] + "</b><span>" + r[2] + '</span></div><span class="eqchip sm">' + r[3] + "</span></div>";
        }).join("") + '</div><p class="io-sub">Beat each floor\'s boss to go deeper. Then come back and crack it <b>by hand</b>.</p>' +
          '<button class="btn brass" id="ioNext">Next' + A.icon("next", 18) + "</button></div>";
      },
      run: function () { [0, 1, 2].forEach(function (i) { later(300 + i * 450, function () { S.clunk(0); }); }); q("#ioNext").onclick = next; }
    },
    { // 5. scoring, then into the bank
      html: function () {
        return '<div class="io-panel"><h2>Pull off the perfect job</h2><div class="io-stars">' + [["Cracked", "Open the lock"], ["Clean job", "Hit par or better"], ["Solo", "No tips"]].map(function (s, i) {
          return '<div style="animation-delay:' + (0.25 + i * 0.35) + 's">' + A.star(true, 64) + "<b>" + s[0] + "</b><span>" + s[1] + "</span></div>";
        }).join("") + '</div><p class="io-sub">Undo is always free. A tip from the Inside Man costs a star.</p>' +
          '<div class="io-actions"><button class="btn brass big" id="ioJob">Take the first job' + A.icon("next", 20) + '</button><button class="btn big" id="ioMap">Look around the bank</button></div></div>';
      },
      run: function () {
        [0, 1, 2].forEach(function (i) { later(250 + i * 350, function () { S.coin(i); }); });
        q("#ioJob").onclick = function () { finish("job"); };
        q("#ioMap").onclick = function () { finish("map"); };
        q("#ioJob").focus();
      }
    }
  ];

  root.Intro = { play: play };
})(window);
