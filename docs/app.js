/* Barycenterology — main app */

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ---------- starfield ----------
(function starfield() {
  const c = document.getElementById("stars");
  const ctx = c.getContext("2d");
  let stars = [];
  let w, h;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = c.clientWidth = window.innerWidth;
    h = c.clientHeight = window.innerHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round((w * h) / 9000);
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.1 + 0.15,
      a: Math.random() * 0.6 + 0.2,
      s: Math.random() * 0.6 + 0.2,
      p: Math.random() * Math.PI * 2,
    }));
  }
  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const st of stars) {
      const tw = 0.5 + Math.sin(t * 0.001 * st.s + st.p) * 0.5;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(246, 236, 215, ${st.a * (0.6 + 0.4 * tw)})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });
  requestAnimationFrame(draw);
})();

// ---------- data ----------
Promise.all([
  fetch("data.json").then((r) => r.json()),
  fetch("events.json").then((r) => r.json()),
])
  .then(([bary, evs]) => init(bary, evs))
  .catch((err) => {
    console.error(err);
    document.body.insertAdjacentHTML(
      "beforeend",
      `<pre style="color:#f66;padding:2rem">Failed to load data: ${err}</pre>`
    );
  });

function init(bary, evs) {
  const samples = bary.samples; // [{t: 'YYYY-MM', d: rsun}]
  const stats = bary.meta.stats;

  // helpers
  const yearOf = (t) => parseInt(t.slice(0, 4), 10);
  const monthOf = (t) => parseInt(t.slice(5, 7), 10);
  const fracYear = (t) => yearOf(t) + (monthOf(t) - 1) / 12;
  const yearsSpan = [fracYear(samples[0].t), fracYear(samples[samples.length - 1].t) + 1 / 12];
  const dMax = 3.0; // cap chart at 3 R_sun (>97% of values are under 2)

  // stats line
  $("#stats").textContent =
    `Across 1800–2200, the barycenter sits inside the Sun about ` +
    `${stats.pct_inside_1Rsun.toFixed(1)}% of the time — and within half a solar radius ` +
    `about ${stats.pct_inside_0_5Rsun.toFixed(1)}%.`;

  // ---------- chart ----------
  const svg = $("#chart-svg");
  const VB = { w: 1000, h: 380 };
  const pad = { l: 44, r: 14, t: 16, b: 34 };
  const iw = VB.w - pad.l - pad.r;
  const ih = VB.h - pad.t - pad.b;

  const xScale = (y) => pad.l + ((y - yearsSpan[0]) / (yearsSpan[1] - yearsSpan[0])) * iw;
  const yScale = (d) => pad.t + (1 - Math.min(d, dMax) / dMax) * ih;

  // gradient defs
  const NS = "http://www.w3.org/2000/svg";
  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML = `
    <linearGradient id="curveGrad" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%"  stop-color="#d4749a"/>
      <stop offset="${((1 - 1 / dMax) * 100).toFixed(1)}%" stop-color="#d4749a"/>
      <stop offset="${((1 - 1 / dMax) * 100).toFixed(1)}%" stop-color="#f5c26b"/>
      <stop offset="100%" stop-color="#f7dca1"/>
    </linearGradient>
    <radialGradient id="eqPulse" cx="50%" cy="50%" r="50%">
      <stop offset="0%"  stop-color="#b9a0ff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#7b5ce0" stop-opacity="0"/>
    </radialGradient>`;
  svg.appendChild(defs);

  // background band for inside-Sun (below y=1)
  const bandIn = document.createElementNS(NS, "rect");
  bandIn.setAttribute("class", "band-in");
  bandIn.setAttribute("x", pad.l);
  bandIn.setAttribute("y", yScale(1));
  bandIn.setAttribute("width", iw);
  bandIn.setAttribute("height", pad.t + ih - yScale(1));
  svg.appendChild(bandIn);

  const bandOut = document.createElementNS(NS, "rect");
  bandOut.setAttribute("class", "band-out");
  bandOut.setAttribute("x", pad.l);
  bandOut.setAttribute("y", pad.t);
  bandOut.setAttribute("width", iw);
  bandOut.setAttribute("height", yScale(1) - pad.t);
  svg.appendChild(bandOut);

  // grid + axes
  const gridG = document.createElementNS(NS, "g");
  gridG.setAttribute("class", "grid");
  for (const v of [0.5, 1.0, 1.5, 2.0, 2.5]) {
    const ln = document.createElementNS(NS, "line");
    ln.setAttribute("x1", pad.l);
    ln.setAttribute("x2", pad.l + iw);
    ln.setAttribute("y1", yScale(v));
    ln.setAttribute("y2", yScale(v));
    gridG.appendChild(ln);
  }
  svg.appendChild(gridG);

  // Sun surface line
  const sunLine = document.createElementNS(NS, "line");
  sunLine.setAttribute("class", "sun-line");
  sunLine.setAttribute("x1", pad.l);
  sunLine.setAttribute("x2", pad.l + iw);
  sunLine.setAttribute("y1", yScale(1));
  sunLine.setAttribute("y2", yScale(1));
  svg.appendChild(sunLine);

  const sunLabel = document.createElementNS(NS, "text");
  sunLabel.setAttribute("x", pad.l + 6);
  sunLabel.setAttribute("y", yScale(1) - 6);
  sunLabel.setAttribute("fill", "#f5c26b");
  sunLabel.setAttribute("font-size", "11");
  sunLabel.setAttribute("font-style", "italic");
  sunLabel.textContent = "Sun's surface (1 R☉)";
  svg.appendChild(sunLabel);

  // curve
  const pts = samples.map((s) => [xScale(fracYear(s.t)), yScale(s.d)]);
  let dAttr = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) dAttr += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;

  const glow = document.createElementNS(NS, "path");
  glow.setAttribute("class", "curve-glow");
  glow.setAttribute("d", dAttr);
  svg.appendChild(glow);

  const curve = document.createElementNS(NS, "path");
  curve.setAttribute("class", "curve");
  curve.setAttribute("d", dAttr);
  svg.appendChild(curve);

  // x-axis ticks (every 50 years)
  const axG = document.createElementNS(NS, "g");
  axG.setAttribute("class", "axis");
  for (let y = 1800; y <= 2200; y += 50) {
    const x = xScale(y);
    const tk = document.createElementNS(NS, "line");
    tk.setAttribute("x1", x); tk.setAttribute("x2", x);
    tk.setAttribute("y1", pad.t + ih);
    tk.setAttribute("y2", pad.t + ih + 5);
    axG.appendChild(tk);
    const txt = document.createElementNS(NS, "text");
    txt.setAttribute("x", x);
    txt.setAttribute("y", pad.t + ih + 18);
    txt.setAttribute("text-anchor", "middle");
    txt.textContent = y;
    axG.appendChild(txt);
  }
  // y-axis ticks
  for (const v of [0, 1, 2, 3]) {
    const y = yScale(v);
    const tk = document.createElementNS(NS, "line");
    tk.setAttribute("x1", pad.l - 4); tk.setAttribute("x2", pad.l);
    tk.setAttribute("y1", y); tk.setAttribute("y2", y);
    axG.appendChild(tk);
    const txt = document.createElementNS(NS, "text");
    txt.setAttribute("x", pad.l - 8);
    txt.setAttribute("y", y + 4);
    txt.setAttribute("text-anchor", "end");
    txt.textContent = v.toFixed(0);
    axG.appendChild(txt);
  }
  const yAxisLabel = document.createElementNS(NS, "text");
  yAxisLabel.setAttribute("x", 12);
  yAxisLabel.setAttribute("y", pad.t + ih / 2);
  yAxisLabel.setAttribute("transform", `rotate(-90 12 ${pad.t + ih / 2})`);
  yAxisLabel.setAttribute("text-anchor", "middle");
  yAxisLabel.setAttribute("fill", "#8f83b5");
  yAxisLabel.setAttribute("font-size", "11");
  yAxisLabel.textContent = "distance from Sun's center (R☉)";
  svg.appendChild(yAxisLabel);
  svg.appendChild(axG);

  // event markers
  const evLayer = document.createElementNS(NS, "g");
  evLayer.setAttribute("id", "event-layer");
  for (const e of evs.events) {
    const yr = fracYear(e.date);
    const x = xScale(yr);
    const s = nearestSample(samples, e.date);
    const y = yScale(s.d);
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "event-marker");
    g.setAttribute("data-date", e.date);
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", 3.6);
    c.setAttribute("fill",
      e.kind === "good" ? "#f5c26b" :
      e.kind === "bad"  ? "#d4749a" : "#b9a0ff");
    c.setAttribute("stroke", "#0b0a1f");
    c.setAttribute("stroke-width", "1");
    g.appendChild(c);
    g.addEventListener("mouseenter", (ev) => showTip(ev, e, s));
    g.addEventListener("mouseleave", hideTip);
    g.addEventListener("click", () => {
      const el = document.querySelector(`.event[data-date="${e.date}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    evLayer.appendChild(g);
  }
  svg.appendChild(evLayer);

  // now indicator
  const nowLine = document.createElementNS(NS, "line");
  nowLine.setAttribute("class", "now-line");
  nowLine.setAttribute("y1", pad.t);
  nowLine.setAttribute("y2", pad.t + ih);
  svg.appendChild(nowLine);
  const nowDot = document.createElementNS(NS, "circle");
  nowDot.setAttribute("class", "now-dot");
  nowDot.setAttribute("r", 5);
  svg.appendChild(nowDot);

  // tooltip
  const tt = $("#tooltip");
  const wrap = $(".chart-wrap");
  function showTip(ev, e, s) {
    tt.hidden = false;
    tt.innerHTML =
      `<span class="tt-year">${prettyDate(e.date)} · ${labelKind(e.kind)}</span>` +
      `<span class="tt-d">${escapeHTML(e.title)}</span>`;
    positionTip(ev);
  }
  function positionTip(ev) {
    const r = wrap.getBoundingClientRect();
    tt.style.left = (ev.clientX - r.left) + "px";
    tt.style.top  = (ev.clientY - r.top) + "px";
  }
  function hideTip() { tt.hidden = true; }
  svg.addEventListener("mousemove", (ev) => { if (!tt.hidden) positionTip(ev); });

  // ---------- orrery ----------
  const orrery = $("#orrery");
  const O_NS = "http://www.w3.org/2000/svg";
  const orDefs = document.createElementNS(O_NS, "defs");
  orDefs.innerHTML = `
    <radialGradient id="sunFace" cx="50%" cy="50%" r="50%">
      <stop offset="0%"  stop-color="#fff2cf"/>
      <stop offset="60%" stop-color="#f5c26b"/>
      <stop offset="100%" stop-color="#c2761c"/>
    </radialGradient>
    <radialGradient id="sunHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0%"  stop-color="#f5c26b" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#f5c26b" stop-opacity="0"/>
    </radialGradient>`;
  orrery.appendChild(orDefs);

  // reference rings 1, 2, 3 R_sun
  for (const r of [1, 2, 3]) {
    const cir = document.createElementNS(O_NS, "circle");
    cir.setAttribute("cx", 0); cir.setAttribute("cy", 0); cir.setAttribute("r", r);
    cir.setAttribute("fill", "none");
    cir.setAttribute("stroke", r === 1 ? "#f5c26b" : "rgba(246,236,215,0.14)");
    cir.setAttribute("stroke-width", r === 1 ? 0.03 : 0.015);
    if (r !== 1) cir.setAttribute("stroke-dasharray", "0.06 0.08");
    orrery.appendChild(cir);
  }
  // Sun halo + face
  const halo = document.createElementNS(O_NS, "circle");
  halo.setAttribute("cx", 0); halo.setAttribute("cy", 0); halo.setAttribute("r", 1.9);
  halo.setAttribute("fill", "url(#sunHalo)");
  orrery.appendChild(halo);
  const sun = document.createElementNS(O_NS, "circle");
  sun.setAttribute("cx", 0); sun.setAttribute("cy", 0); sun.setAttribute("r", 1);
  sun.setAttribute("fill", "url(#sunFace)");
  orrery.appendChild(sun);

  // barycenter trail (last 60 samples around current)
  const trail = document.createElementNS(O_NS, "path");
  trail.setAttribute("fill", "none");
  trail.setAttribute("stroke", "#b9a0ff");
  trail.setAttribute("stroke-width", 0.03);
  trail.setAttribute("stroke-opacity", 0.6);
  orrery.appendChild(trail);

  // barycenter point
  const bp = document.createElementNS(O_NS, "circle");
  bp.setAttribute("r", 0.09);
  bp.setAttribute("fill", "#b9a0ff");
  bp.setAttribute("stroke", "#fff");
  bp.setAttribute("stroke-width", 0.02);
  orrery.appendChild(bp);

  // For orrery we need x,y positions — we only have magnitude. Synthesize a plausible
  // angle from a smooth mapping of the year (barycenter orbits with a period dominated by Jupiter+Saturn).
  // This is illustrative only, not physical.
  function baryXY(idx) {
    const s = samples[idx];
    const yr = fracYear(s.t);
    // Two dominant frequencies: J-S synodic ~19.86y, Jupiter ~11.86y
    const th = (yr / 19.86) * 2 * Math.PI + Math.sin((yr / 11.86) * 2 * Math.PI) * 0.6;
    return [Math.cos(th) * s.d, Math.sin(th) * s.d];
  }

  // ---------- events list ----------
  const eventsEl = $("#events");
  const sortedEvs = evs.events.slice().sort((a, b) => a.date.localeCompare(b.date));
  for (const e of sortedEvs) {
    const li = document.createElement("li");
    li.className = `event ${e.kind}`;
    li.dataset.date = e.date;
    li.dataset.kind = e.kind;
    li.innerHTML = `
      <span class="marker" aria-hidden="true"></span>
      <span class="when">${prettyDate(e.date)} · ${labelKind(e.kind)}</span>
      <h3 class="title">${escapeHTML(e.title)}</h3>
      <p class="blurb">${escapeHTML(e.blurb)}</p>
      ${e.wiki ? `<a class="wiki" href="https://en.wikipedia.org/wiki/${e.wiki}" target="_blank" rel="noopener">Wikipedia →</a>` : ""}
    `;
    eventsEl.appendChild(li);
  }

  // filters
  $$(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".chip").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const f = btn.dataset.filter;
      $$(".event").forEach((el) => {
        el.classList.toggle("hidden", f !== "all" && el.dataset.kind !== f);
      });
    });
  });

  // ---------- slider linkage ----------
  const slider = $("#year-slider");
  const yearOut = $("#year-out");

  function updateFromYear(year) {
    yearOut.textContent = year;
    // find nearest sample
    const targetT = `${year}-06`;
    const s = nearestSample(samples, targetT);
    const idx = samples.indexOf(s);
    const x = xScale(fracYear(s.t));
    const y = yScale(s.d);
    nowLine.setAttribute("x1", x);
    nowLine.setAttribute("x2", x);
    nowDot.setAttribute("cx", x);
    nowDot.setAttribute("cy", y);

    // orrery
    const [bx, by] = baryXY(idx);
    bp.setAttribute("cx", bx);
    bp.setAttribute("cy", by);
    // trail — 36 months back
    const start = Math.max(0, idx - 36);
    let tp = "";
    for (let i = start; i <= idx; i++) {
      const [tx, ty] = baryXY(i);
      tp += (i === start ? "M" : " L") + tx.toFixed(3) + " " + ty.toFixed(3);
    }
    trail.setAttribute("d", tp);

    $("#or-year").textContent = year;
    $("#or-dist").textContent = s.d.toFixed(3) + " R☉";
    $("#or-phase").textContent =
      s.d < 0.15 ? "Equilibrium" :
      s.d < 1.0  ? "Inside the Sun · light" :
                   "Outside the Sun · shadow";
  }

  slider.addEventListener("input", (e) => updateFromYear(parseInt(e.target.value, 10)));
  updateFromYear(2026);
}

// ---------- utilities ----------
function nearestSample(samples, target) {
  // simple binary search on 'YYYY-MM' lex order (works since fixed width)
  let lo = 0, hi = samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t < target) lo = mid + 1; else hi = mid;
  }
  // check neighbour
  if (lo > 0) {
    const a = samples[lo - 1], b = samples[lo];
    return (Math.abs(diffMonths(a.t, target)) < Math.abs(diffMonths(b.t, target))) ? a : b;
  }
  return samples[lo];
}
function diffMonths(a, b) {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (ay - by) * 12 + (am - bm);
}
function prettyDate(t) {
  const [y, m] = t.split("-");
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${months[parseInt(m,10)-1]} ${y}`;
}
function labelKind(k) {
  return k === "good" ? "Light" : k === "bad" ? "Shadow" : "Equilibrium";
}
function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
