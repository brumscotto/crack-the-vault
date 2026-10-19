// Crack the Vault: the math engine.
// Exact fractions, equation rows, the five moves a player can make, problem generators
// for each floor, and an auto-solver that sets par and powers the Inside Man's tips.
// The fraction helpers, generators and rank check are adapted from Aaron Bergmann's AlgebraNotebook.
(function (root) {
  "use strict";

  // ---- fractions: {n, d} ----
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function lcm(a, b) { return Math.abs(a * b) / gcd(a, b); }
  function F(n, d) { if (d === undefined) d = 1; if (d < 0) { n = -n; d = -d; } var g = gcd(n, d); return { n: n / g, d: d / g }; }
  function add(p, q) { return F(p.n * q.d + q.n * p.d, p.d * q.d); }
  function neg(p) { return F(-p.n, p.d); }
  function sub(p, q) { return add(p, neg(q)); }
  function mul(p, q) { return F(p.n * q.n, p.d * q.d); }
  function div(p, q) { return F(p.n * q.d, p.d * q.n); }
  function abs(p) { return F(Math.abs(p.n), p.d); }
  function isZ(p) { return p.n === 0; }
  function isOne(p) { return p.n === 1 && p.d === 1; }
  function isInt(p) { return p.d === 1; }
  function same(p, q) { return p.n === q.n && p.d === q.d; }
  function str(p) { return (p.n < 0 ? "−" : "") + Math.abs(p.n) + (p.d > 1 ? "/" + p.d : ""); }
  function wrap(p) { return p.n < 0 || p.d > 1 ? "(" + str(p) + ")" : str(p); }
  function parseNum(s) {
    s = String(s).trim().replace(/−/g, "-").replace(/\s+/g, "");
    var m = s.match(/^(-?\d+)\/(-?\d+)$/);
    if (m) return +m[2] === 0 ? null : F(+m[1], +m[2]);
    m = s.match(/^(-?)(\d*)\.(\d+)$/);
    if (m) { var p = Math.pow(10, m[3].length); return F((m[1] ? -1 : 1) * (+(m[2] || 0) * p + +m[3]), p); }
    if (/^-?\d+$/.test(s)) return F(+s);
    return null;
  }

  // ---- rows: co.x x + co.y y + co.z z + k = c ----
  var VARS = ["x", "y", "z"];
  function mkRow(id, co, k, c, kFirst) {
    return { id: id, co: { x: F(co[0] || 0), y: F(co[1] || 0), z: F(co[2] || 0) }, k: F(k || 0), c: F(c), kFirst: !!kFirst };
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function varsIn(r) { return VARS.filter(function (v) { return r.co[v].n !== 0; }); }
  // a row with every variable gone: "inf" when it reads true (0 = 0), "none" when it can never be true (0 = 5)
  function zeroKind(r) { if (varsIn(r).length) return null; return same(r.k, r.c) ? "inf" : "none"; }
  function rowById(s, id) { for (var i = 0; i < s.rows.length; i++) if (s.rows[i].id === id) return s.rows[i]; return null; }
  function rowText(r) {
    var parts = [], first = true;
    var terms = varsIn(r).map(function (v) { return { v: v, c: r.co[v] }; });
    if (!isZ(r.k)) { if (r.kFirst) terms.unshift({ c: r.k }); else terms.push({ c: r.k }); }
    terms.forEach(function (t) {
      var a = abs(t.c), mag = t.v ? (isOne(a) ? "" : str(a)) + t.v : str(a);
      parts.push(first ? (t.c.n < 0 ? "−" : "") + mag : (t.c.n < 0 ? "− " : "+ ") + mag);
      first = false;
    });
    if (first) parts.push("0");
    return parts.join(" ") + " = " + str(r.c);
  }

  // ---- moves: each returns { state, events, move } or { error } ----
  function err(t) { return { error: t }; }
  function finish(t, move) {
    t.moves++; var events = [];
    t.rows = t.rows.filter(function (r) {
      var vs = varsIn(r);
      if (vs.length === 1 && isZ(r.k) && isOne(r.co[vs[0]])) { t.solved[vs[0]] = r.c; events.push({ type: "solved", v: vs[0], value: r.c, id: r.id }); return false; }
      return true;
    });
    t.rows.forEach(function (r) { var z = zeroKind(r); if (z) events.push({ type: "zero", kind: z, id: r.id }); });
    return { state: t, events: events, move: move };
  }
  function opMul(s, id, m) {
    if (!m) return err("Type a number to multiply by, like 3, −2 or 1/2.");
    if (isZ(m)) return err("Multiplying by 0 wipes out the whole equation. Pick a different number.");
    if (isOne(m)) return err("Multiplying by 1 changes nothing. Try a different number.");
    var t = clone(s), r = rowById(t, id);
    VARS.forEach(function (v) { r.co[v] = mul(r.co[v], m); });
    r.k = mul(r.k, m); r.c = mul(r.c, m);
    return finish(t, { type: "mul", id: id, m: m });
  }
  function opAdd(s, src, tgt) {
    if (src === tgt) return err("Drop the row onto a different row.");
    var t = clone(s), p = rowById(t, src), r = rowById(t, tgt), cancelled = [];
    VARS.forEach(function (v) {
      var had = !isZ(r.co[v]) || !isZ(p.co[v]);
      r.co[v] = add(r.co[v], p.co[v]);
      if (had && isZ(r.co[v])) cancelled.push(v);
    });
    r.k = add(r.k, p.k); r.c = add(r.c, p.c); r.kFirst = false;
    return finish(t, { type: "add", src: src, tgt: tgt, cancelled: cancelled });
  }
  function opConst(s, id) {
    var t = clone(s), r = rowById(t, id);
    if (isZ(r.k)) return err("There is no plain number on that side to move.");
    var k = r.k;
    r.c = sub(r.c, r.k); r.k = F(0); r.kFirst = false;
    return finish(t, { type: "const", id: id, k: k });
  }
  function opDiv(s, id) {
    var t = clone(s), r = rowById(t, id), vs = varsIn(r);
    if (vs.length !== 1) return err("Divide once only one variable is left in the row.");
    var a = r.co[vs[0]];
    if (isOne(a)) return err("The coefficient is already 1.");
    var m = div(F(1), a);
    r.co[vs[0]] = F(1); r.k = mul(r.k, m); r.c = mul(r.c, m);
    return finish(t, { type: "div", id: id, a: a, v: vs[0] });
  }
  function opSub(s, v, id) {
    var t = clone(s), r = rowById(t, id), val = t.solved[v];
    if (!val) return err("That dial isn't cracked yet.");
    if (isZ(r.co[v])) return err("Row " + id + " has no " + v + " in it.");
    var co = r.co[v];
    r.k = add(r.k, mul(co, val)); r.co[v] = F(0); r.kFirst = false;
    return finish(t, { type: "sub", id: id, v: v, co: co, val: val });
  }
  function apply(s, mv) {
    if (mv.type === "mul") return opMul(s, mv.id, mv.m);
    if (mv.type === "add") return opAdd(s, mv.src, mv.tgt);
    if (mv.type === "const") return opConst(s, mv.id);
    if (mv.type === "div") return opDiv(s, mv.id);
    if (mv.type === "sub") return opSub(s, mv.v, mv.id);
    return err("Unknown move");
  }
  function isWon(s) { return s.rows.length === 0 && s.vars.every(function (v) { return s.solved[v]; }); }

  // ---- the auto-solver: a plan of moves from any position ----
  // multipliers that make coefficients a (source row) and b (target row) opposites
  function mulsFor(a, b) {
    if (same(a, neg(b))) return [];
    var r = div(neg(b), a);
    if (isInt(r)) return [{ who: "p", m: r }];
    var q = div(neg(a), b);
    if (isInt(q)) return [{ who: "t", m: q }];
    if (isInt(a) && isInt(b)) {
      var L = lcm(a.n, b.n), mp = F(L / Math.abs(a.n)), mt = F(L / Math.abs(b.n));
      if ((a.n > 0) === (b.n > 0)) mt = neg(mt);
      return [{ who: "p", m: mp }, { who: "t", m: mt }];
    }
    return [{ who: "p", m: r }];
  }
  function elimPlan(s) {
    var rows = s.rows, cnt = function (r) { return varsIn(r).length; };
    var m = Math.min.apply(null, rows.map(cnt)), best = null;
    rows.forEach(function (p) {
      rows.forEach(function (t) {
        if (p === t) return;
        VARS.forEach(function (v) {
          if (isZ(p.co[v]) || isZ(t.co[v])) return;
          var ms = mulsFor(p.co[v], t.co[v]), pm = F(1), tm = F(1);
          ms.forEach(function (x) { if (x.who === "p") pm = x.m; else tm = x.m; });
          var res = VARS.filter(function (w) { return !isZ(add(mul(p.co[w], pm), mul(t.co[w], tm))); });
          var n = res.length, tier;
          if (n < m) tier = 0;
          else if (n === m && cnt(t) > m && rows.some(function (o) { return o !== t && cnt(o) === m && varsIn(o).join() === res.join(); })) tier = 1;
          else if (n < cnt(t)) tier = 2;
          else return;
          var score = [tier, tier === 1 ? 0 : n, ms.length];
          if (!best || cmp(score, best.score) < 0) best = { score: score, p: p.id, t: t.id, v: v, ms: ms };
        });
      });
    });
    if (!best) return [];
    var meta = { v: best.v, p: best.p, t: best.t };
    var plan = best.ms.map(function (x) { return { type: "mul", id: x.who === "p" ? best.p : best.t, m: x.m, meta: meta }; });
    plan.push({ type: "add", src: best.p, tgt: best.t, meta: meta });
    return plan;
  }
  function cmp(a, b) { for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; }
  function plan(s) {
    var i, r;
    for (i = 0; i < s.rows.length; i++) { var z = zeroKind(s.rows[i]); if (z) return [{ type: "declare", kind: z, id: s.rows[i].id }]; }
    for (i = 0; i < s.rows.length; i++) {
      r = s.rows[i];
      if (varsIn(r).length === 1) return isZ(r.k) ? [{ type: "div", id: r.id, v: varsIn(r)[0] }] : [{ type: "const", id: r.id }];
    }
    // tidy up: a number left over from substituting moves to the right side
    for (i = 0; i < s.rows.length; i++) if (!isZ(s.rows[i].k)) return [{ type: "const", id: s.rows[i].id }];
    var sb = null;
    Object.keys(s.solved).forEach(function (v) {
      s.rows.forEach(function (r) {
        if (!isZ(r.co[v]) && (!sb || varsIn(r).length < sb.n)) sb = { type: "sub", v: v, id: r.id, n: varsIn(r).length };
      });
    });
    if (sb) return [{ type: "sub", v: sb.v, id: sb.id }];
    return elimPlan(s);
  }
  function simulate(s) {
    var st = clone(s), moves = 0, guard = 0;
    while (guard++ < 60 && !isWon(st)) {
      var pl = plan(st);
      if (!pl.length) break;
      if (pl[0].type === "declare") return { par: moves + 1, end: pl[0].kind };
      for (var i = 0; i < pl.length; i++) { var res = apply(st, pl[i]); if (res.error) return { par: moves, end: "stuck" }; st = res.state; moves++; }
    }
    return { par: moves, end: isWon(st) ? "won" : "stuck" };
  }

  // ---- how many solutions: "one", "inf" or "none" (rank check) ----
  function rankOf(M) {
    var A = M.map(function (r) { return r.slice(); }), rk = 0;
    for (var c = 0; c < A[0].length && rk < A.length; c++) {
      var pv = -1;
      for (var i = rk; i < A.length; i++) if (A[i][c].n) { pv = i; break; }
      if (pv < 0) continue;
      var t = A[pv]; A[pv] = A[rk]; A[rk] = t;
      for (var q = 0; q < A.length; q++) {
        if (q === rk || !A[q][c].n) continue;
        var f = div(A[q][c], A[rk][c]);
        A[q] = A[q].map(function (x, j) { return sub(x, mul(f, A[rk][j])); });
      }
      rk++;
    }
    return rk;
  }
  function classify(rows, vars) {
    var M = rows.map(function (r) { return vars.map(function (v) { return r.co[v]; }); });
    var r1 = rankOf(M), r2 = rankOf(M.map(function (row, i) { return row.concat([sub(rows[i].c, rows[i].k)]); }));
    return r1 === vars.length ? "one" : r2 > r1 ? "none" : "inf";
  }

  // ---- generators ----
  var rand = Math.random;
  function rnd(n) { return Math.floor(rand() * n); }
  function nz(m) { var v = 0; while (!v) v = rnd(2 * m + 1) - m; return v; }
  function pick(a) { return a[rnd(a.length)]; }
  var IDS = ["A", "B", "C"];

  // one variable: a x + k = c
  function oneVar(level, v, id) {
    var a, k, x, kFirst = false;
    if (level === 0) { a = 1; k = nz(9); x = rnd(12) + 1; }
    else if (level === 1) { a = rnd(5) + 2; k = 0; x = nz(9); }
    else if (level <= 3) { a = rnd(4) + 2; k = nz(9); x = nz(9); kFirst = level === 3 && rnd(2) === 1; }
    else if (level <= 5) { a = nz(6); if (Math.abs(a) < 2) a = a < 0 ? -2 : 3; k = nz(12); x = nz(10); kFirst = rnd(2) === 1; }
    else { a = nz(9); if (Math.abs(a) < 2) a = a < 0 ? -3 : 4; k = nz(20); x = nz(12); kFirst = rnd(2) === 1; }
    var co = [0, 0, 0]; co[VARS.indexOf(v)] = a;
    return mkRow(id, co, k, a * x + k, kFirst);
  }
  function mulCount(a, b) { return a === -b ? 0 : (a % b === 0 || b % a === 0) ? 1 : 2; }
  function twoByTwo(need, m, sm) {
    for (;;) {
      var x = nz(sm), y = nz(sm), a1 = nz(m), b1 = nz(m), a2 = nz(m), b2 = nz(m);
      if (need === 0) { if (rnd(2)) a2 = -a1; else b2 = -b1; }
      if (a1 * b2 - a2 * b1 === 0) continue;
      if (Math.min(mulCount(a1, a2), mulCount(b1, b2)) !== need) continue;
      if (Math.abs(a1) === Math.abs(b1) && Math.abs(a2) === Math.abs(b2)) continue;
      return [[a1, b1], [a2, b2]].map(function (p, i) { return mkRow(IDS[i], [p[0], p[1], 0], 0, p[0] * x + p[1] * y); });
    }
  }
  function threeByThree(cm, sm) {
    for (;;) {
      var sol = [nz(sm), nz(sm), nz(sm)], M = [0, 1, 2].map(function () { return [nz(cm), nz(cm), nz(cm)]; });
      var det = M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
      if (!det) continue;
      return M.map(function (r, i) { return mkRow(IDS[i], r, 0, r[0] * sol[0] + r[1] * sol[1] + r[2] * sol[2]); });
    }
  }
  // a rigged lock: one row is built from the others, so there are no solutions or endless ones
  function rigged(n, kind) {
    var d = nz(5), vars = n === 2 ? ["x", "y"] : VARS;
    for (;;) {
      var rows;
      if (n === 2) {
        var a = nz(5), b = nz(5), c = nz(12), m = pick([2, 3, -1, -2, -3]);
        rows = [mkRow("A", [a, b, 0], 0, c), mkRow("B", [a * m, b * m, 0], 0, c * m + (kind === "none" ? d : 0))];
      } else {
        var r1 = [nz(3), nz(3), nz(3), nz(9)], r2 = [nz(3), nz(3), nz(3), nz(9)], p = pick([1, 2, -1, -2]), q = pick([1, 2, -1, -2]);
        var r3 = r1.map(function (x, j) { return p * x + q * r2[j]; });
        if (kind === "none") r3[3] += d;
        if (!r3[0] || !r3[1] || !r3[2]) continue;
        rows = [r1, r2, r3].map(function (r, i) { return mkRow(IDS[i], r.slice(0, 3), 0, r[3]); });
      }
      if (classify(rows, vars) === kind) return rows;
    }
  }
  function trick(chance) { return rand() < chance ? (rand() < 0.5 ? "inf" : "none") : null; }

  // a vault for floor f (1-3), level l (0-7, 8 = boss)
  function makeVault(f, l) {
    var rows, vars, tk = null;
    if (f === 1) {
      if (l === 8) { vars = VARS.slice(); rows = VARS.map(function (v, i) { return oneVar(6, v, IDS[i]); }); }
      else { vars = ["x"]; rows = [oneVar(l, "x", "A")]; }
    } else if (f === 2) {
      vars = ["x", "y"];
      tk = l === 6 ? (rand() < 0.5 ? "inf" : "none") : l === 7 || l === 8 ? trick(0.3) : l === 5 ? trick(0.2) : null;
      if (tk) rows = rigged(2, tk);
      else rows = l === 8 ? twoByTwo(2, 8, 10) : twoByTwo(l <= 1 ? 0 : l <= 3 ? 1 : 2, l >= 4 ? 6 : 5, 7);
    } else {
      vars = VARS.slice();
      tk = l === 6 ? (rand() < 0.5 ? "inf" : "none") : l >= 7 ? trick(0.3) : null;
      if (tk) rows = rigged(3, tk);
      else {
        var band = l <= 1 ? [0, 13] : l <= 4 ? [12, 16] : l === 8 ? [16, 99] : [14, 99], tries = 0;
        for (;;) {
          rows = l === 8 ? threeByThree(4, 6) : threeByThree(l <= 1 ? 2 : 3, l <= 1 ? 4 : 5);
          var pr = simulate({ vars: vars, rows: rows, solved: {}, moves: 0 }).par;
          if ((pr >= band[0] && pr <= band[1]) || ++tries > 200) break;
        }
      }
    }
    var st = { vars: vars, rows: rows, solved: {}, moves: 0 };
    var kind = vars.length === 1 ? "one" : f === 1 ? "one" : classify(rows, vars);
    return { floor: f, level: l, vars: vars, state: st, kind: kind, par: simulate(st).par };
  }

  root.Engine = {
    F: F, add: add, sub: sub, mul: mul, div: div, neg: neg, abs: abs, isZ: isZ, isOne: isOne, isInt: isInt, same: same,
    str: str, wrap: wrap, parseNum: parseNum, VARS: VARS, varsIn: varsIn, zeroKind: zeroKind, rowById: rowById, rowText: rowText,
    opMul: opMul, opAdd: opAdd, opConst: opConst, opDiv: opDiv, opSub: opSub, apply: apply, isWon: isWon,
    plan: plan, simulate: simulate, classify: classify, makeVault: makeVault, clone: clone
  };
})(typeof window !== "undefined" ? window : globalThis);
