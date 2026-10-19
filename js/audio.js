// Crack the Vault: sound effects, synthesized with Web Audio (no sound files).
(function (root) {
  "use strict";
  var ctx = null, on = true;
  function ac() {
    if (!on) return null;
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
    } catch (e) { return null; }
    return ctx;
  }
  function tone(freq, dur, type, vol, when, slideTo) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, when, freq, q) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (when || 0), len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = "bandpass"; f.frequency.value = freq || 2000; f.Q.value = q || 1; g.gain.value = vol || 0.2;
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  }
  var S = {
    setOn: function (v) { on = !!v; },
    isOn: function () { return on; },
    unlock: function () { ac(); },
    pick: function () { noise(0.03, 0.25, 0, 3200, 4); },
    drop: function () { tone(180, 0.12, "triangle", 0.25); noise(0.05, 0.2, 0, 900, 2); },
    snap: function () { noise(0.04, 0.3, 0, 2400, 6); tone(520, 0.08, "square", 0.05); },
    cancel: function () { tone(330, 0.12, "sine", 0.2); tone(660, 0.18, "sine", 0.15, 0.07); },
    tick: function (n) { for (var i = 0; i < (n || 8); i++) noise(0.015, 0.22, i * 0.045, 4200, 8); },
    clunk: function (when) { tone(90, 0.25, "sine", 0.5, when, 50); noise(0.08, 0.35, when, 600, 1.5); },
    lock: function () { S.tick(10); S.clunk(0.48); tone(880, 0.25, "sine", 0.12, 0.55); },
    whoosh: function () { var c = ac(); if (!c) return; noise(1.2, 0.12, 0, 400, 0.6); tone(70, 1.2, "sine", 0.25, 0, 40); },
    coin: function (i) { tone(988 * Math.pow(1.122, i || 0), 0.16, "square", 0.05); tone(1319 * Math.pow(1.122, i || 0), 0.3, "square", 0.04, 0.08); },
    fanfare: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.35, "triangle", 0.18, i * 0.11); }); },
    error: function () { tone(160, 0.18, "sawtooth", 0.08); tone(120, 0.25, "sawtooth", 0.08, 0.1); },
    alarm: function () { for (var i = 0; i < 4; i++) { tone(880, 0.16, "square", 0.07, i * 0.34); tone(660, 0.16, "square", 0.07, i * 0.34 + 0.17); } },
    roll: function (up) { tone(up ? 1500 : 1100, 0.025, "square", 0.025); noise(0.012, 0.12, 0, up ? 5200 : 3800, 9); },
    chunk: function (i) { tone(240 - (i || 0) * 12, 0.14, "triangle", 0.3); noise(0.05, 0.25, 0, 700, 2); },
    static: function () { noise(0.28, 0.1, 0, 1700, 0.7); noise(0.05, 0.12, 0.26, 3000, 2); },
    key: function () { noise(0.012, 0.05, 0, 4600, 6); },
    beep: function () { tone(1200, 0.07, "square", 0.05); }
  };
  root.Sfx = S;
})(window);
