// The NORAD big board: a vector world map on canvas with ballistic tracks, blasts, target markers,
// and a tic-tac-toe grid mode for the finale.
(function () {
  const W = window.WOPR;

  const screenEl = document.getElementById('screen');
  const boardEl = document.getElementById('board');
  const canvas = document.getElementById('map');
  const ctx = canvas.getContext('2d');
  const hud = {
    title: document.getElementById('hud-title'),
    clock: document.getElementById('hud-clock'),
    defcon: document.getElementById('hud-defcon'),
    a: document.getElementById('hud-a'),
    b: document.getElementById('hud-b'),
    big: document.getElementById('hud-big'),
  };
  const flashEl = document.getElementById('flash');

  const world = window.WORLD_110M;
  const land = topojson.feature(world, world.objects.land);
  const borders = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);
  const graticule = d3.geoGraticule().step([15, 15])();

  const TOP_LAT = 78;
  const BOTTOM_LAT = 6;
  const CENTER_LON = 10; // Atlantic-centred: the Americas on the left, the USSR on the right

  const B = (W.board = { visible: false, mode: 'map' });

  let dpr = 1;
  let proj = null;
  let box = null; // map rectangle in device pixels, plus wrap width
  const base = document.createElement('canvas');
  const trails = document.createElement('canvas');
  let colors = {};
  let missiles = [];
  let blasts = [];
  let marks = [];
  let ttt = null;
  let raf = 0;

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    colors = { fg: v('--fg'), dim: v('--fg-dim'), a: v('--side-a'), b: v('--side-b'), blast: v('--blast'), bg: v('--bg') };
  }

  function layout() {
    const rect = boardEl.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width === w && canvas.height === h && proj) return;
    canvas.width = base.width = trails.width = w;
    canvas.height = base.height = trails.height = h;

    const pad = 4 * dpr;
    proj = d3.geoMercator().rotate([-CENTER_LON, 0]).precision(0.3);
    proj.fitExtent(
      [[pad, pad + 22 * dpr], [w - pad, h - pad - 22 * dpr]],
      { type: 'MultiPoint', coordinates: [[CENTER_LON - 179.99, TOP_LAT], [CENTER_LON + 179.99, BOTTOM_LAT]] }
    );
    const [x0, y0] = proj([CENTER_LON - 179.99, TOP_LAT]);
    const [x1, y1] = proj([CENTER_LON + 179.99, BOTTOM_LAT]);
    box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0, wrap: proj.scale() * 2 * Math.PI };
    proj.clipExtent([[x0, y0], [x1, y1]]);
    drawBase();
  }

  function drawBase() {
    readColors();
    const g = base.getContext('2d');
    g.clearRect(0, 0, base.width, base.height);
    const path = d3.geoPath(proj, g);

    g.lineWidth = 1 * dpr;
    g.globalAlpha = 0.22;
    g.strokeStyle = colors.dim;
    g.beginPath();
    path(graticule);
    g.stroke();

    g.globalAlpha = 0.06;
    g.fillStyle = colors.fg;
    g.beginPath();
    path(land);
    g.fill();

    g.globalAlpha = 0.5;
    g.strokeStyle = colors.dim;
    g.lineWidth = 0.8 * dpr;
    g.beginPath();
    path(borders);
    g.stroke();

    g.globalAlpha = 0.35;
    g.strokeStyle = colors.fg;
    g.lineWidth = 3 * dpr;
    g.beginPath();
    path(land);
    g.stroke();
    g.globalAlpha = 1;
    g.lineWidth = 1.1 * dpr;
    g.stroke();

    // Every city WOPR knows about, as faint dots.
    g.fillStyle = colors.fg;
    g.globalAlpha = 0.45;
    for (const c of W.cities) {
      const p = proj([c.lon, c.lat]);
      if (!p) continue;
      g.fillRect(p[0] - dpr, p[1] - dpr, 2 * dpr, 2 * dpr);
    }
    g.globalAlpha = 1;

    trails.getContext('2d').clearRect(0, 0, trails.width, trails.height);
  }

  // ---------- geometry ----------

  const project = ([lat, lon]) => proj([lon, lat]);

  function arc(m) {
    const p0 = project(m.from);
    const p1 = project(m.to);
    let x1 = p1[0];
    let shift = 0;
    const dx = x1 - p0[0];
    if (Math.abs(dx) > box.wrap / 2) {
      shift = Math.sign(dx) * box.wrap;
      x1 -= shift;
    }
    const dist = Math.hypot(x1 - p0[0], p1[1] - p0[1]);
    const lift = Math.min(dist * 0.42, box.h * 0.55);
    const c = [(p0[0] + x1) / 2, (p0[1] + p1[1]) / 2 - lift];
    return { p0, p1: [x1, p1[1]], c, shift };
  }

  function at(g, t) {
    const u = 1 - t;
    return [u * u * g.p0[0] + 2 * u * t * g.c[0] + t * t * g.p1[0], u * u * g.p0[1] + 2 * u * t * g.c[1] + t * t * g.p1[1]];
  }

  function tracePath(c, g, t, shift) {
    const steps = Math.max(2, Math.ceil(28 * t));
    c.beginPath();
    for (let i = 0; i <= steps; i++) {
      const p = at(g, (t * i) / steps);
      if (i === 0) c.moveTo(p[0] + shift, p[1]);
      else c.lineTo(p[0] + shift, p[1]);
    }
  }

  function withCopies(g, fn) {
    fn(0);
    if (g.shift) fn(g.shift);
  }

  function clipToMap(c) {
    c.save();
    c.beginPath();
    c.rect(box.x, box.y, box.w, box.h);
    c.clip();
  }

  // ---------- public API ----------

  B.show = function (mode = 'split') {
    screenEl.classList.toggle('board-mode', mode === 'split');
    screenEl.classList.toggle('board-full', mode === 'full');
    boardEl.setAttribute('aria-hidden', 'false');
    B.visible = true;
    readColors();
    if (!raf) raf = requestAnimationFrame(frame);
  };

  B.hide = function () {
    screenEl.classList.remove('board-mode', 'board-full');
    boardEl.setAttribute('aria-hidden', 'true');
    B.visible = false;
    B.clear();
    B.hud({});
    B.big(null);
  };

  B.refreshTheme = function () {
    if (proj) drawBase();
  };

  B.clear = function () {
    for (const m of missiles) m.resolve(false);
    missiles = [];
    blasts = [];
    marks = [];
    ttt = null;
    B.mode = 'map';
    if (proj) trails.getContext('2d').clearRect(0, 0, trails.width, trails.height);
  };

  B.hud = function ({ title = '', clock = '', defcon = '', a = '', b = '' }) {
    hud.title.textContent = title;
    hud.clock.textContent = clock;
    hud.defcon.textContent = defcon ? `DEFCON ${defcon}` : '';
    hud.defcon.className = defcon ? `defcon-${defcon}` : '';
    hud.a.textContent = a;
    hud.b.textContent = b;
  };

  B.setHud = function (key, text) {
    if (key === 'defcon') {
      hud.defcon.textContent = text ? `DEFCON ${text}` : '';
      hud.defcon.className = text ? `defcon-${text}` : '';
    } else hud[key].textContent = text;
  };

  B.big = function (text) {
    if (text) hud.big.textContent = text;
    hud.big.classList.toggle('on', !!text);
  };

  B.flash = function (strength = 0.25) {
    flashEl.animate([{ opacity: strength }, { opacity: 0 }], { duration: 450, easing: 'ease-out' });
  };

  B.mark = function (city, side = 'a') {
    marks.push({ city, side, t0: performance.now() });
  };

  // Fire one missile. Resolves true on impact, or false if the board was cleared first.
  B.launch = function ({ from, to, side = 'a', dur = 5000, onImpact, big = 1 }) {
    return new Promise((resolve) => {
      missiles.push({ from, to, side, dur, t0: performance.now(), resolve, onImpact, big });
      W.audio.launch();
    });
  };

  B.inFlight = () => missiles.length;

  // Tic-tac-toe mode: `state` is { games: [{ cells: Array(9), done, label }], cols }.
  B.showTTT = function (state) {
    B.mode = 'ttt';
    ttt = state;
  };

  // ---------- render loop ----------

  function frame(now) {
    if (!B.visible) {
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(frame);
    layout();
    const c = ctx;
    c.clearRect(0, 0, canvas.width, canvas.height);

    if (B.mode === 'ttt' && ttt) {
      drawTTT(c, now);
      return;
    }

    c.drawImage(base, 0, 0);
    c.drawImage(trails, 0, 0);

    clipToMap(c);
    c.globalCompositeOperation = 'lighter';
    drawMarks(c, now);
    drawMissiles(c, now);
    drawBlasts(c, now);
    c.globalCompositeOperation = 'source-over';
    c.restore();
  }

  function drawMarks(c, now) {
    const on = Math.floor(now / 350) % 2 === 0;
    c.font = `${Math.round(15 * dpr)}px VT323, monospace`;
    c.textBaseline = 'middle';
    for (const m of marks) {
      const p = project([m.city.lat, m.city.lon]);
      if (!p) continue;
      const col = colors[m.side];
      c.strokeStyle = c.fillStyle = col;
      c.lineWidth = 1.2 * dpr;
      const r = 5 * dpr;
      if (on) {
        c.beginPath();
        c.arc(p[0], p[1], r, 0, Math.PI * 2);
        c.moveTo(p[0] - r * 1.8, p[1]);
        c.lineTo(p[0] + r * 1.8, p[1]);
        c.moveTo(p[0], p[1] - r * 1.8);
        c.lineTo(p[0], p[1] + r * 1.8);
        c.stroke();
      }
      c.globalAlpha = 0.9;
      c.fillText(m.city.name, p[0] + r * 2.2, p[1]);
      c.globalAlpha = 1;
    }
  }

  function drawMissiles(c, now) {
    const tctx = trails.getContext('2d');
    const keep = [];
    for (const m of missiles) {
      const t = Math.min(1, (now - m.t0) / m.dur);
      const g = arc(m);
      const col = colors[m.side];
      if (t >= 1) {
        // Leave a faint permanent track and a scar, then detonate.
        clipToMap(tctx);
        tctx.globalAlpha = 0.22;
        tctx.strokeStyle = col;
        tctx.lineWidth = 1 * dpr;
        withCopies(g, (s) => {
          tracePath(tctx, g, 1, s);
          tctx.stroke();
        });
        tctx.globalAlpha = 1;
        tctx.restore();
        blasts.push({ x: g.p1[0] + g.shift, y: g.p1[1], t0: now, side: m.side, big: m.big, scarred: false });
        if (m.onImpact) m.onImpact();
        m.resolve(true);
        continue;
      }
      keep.push(m);
      withCopies(g, (s) => {
        tracePath(c, g, t, s);
        c.strokeStyle = col;
        c.globalAlpha = 0.25;
        c.lineWidth = 4 * dpr;
        c.stroke();
        c.globalAlpha = 0.95;
        c.lineWidth = 1.3 * dpr;
        c.stroke();
        const h = at(g, t);
        c.globalAlpha = 1;
        c.fillStyle = colors.blast;
        c.beginPath();
        c.arc(h[0] + s, h[1], 2.2 * dpr, 0, Math.PI * 2);
        c.fill();
      });
    }
    missiles = keep;
  }

  function drawBlasts(c, now) {
    const R = Math.max(6 * dpr, box.w * 0.011);
    const tctx = trails.getContext('2d');
    const keep = [];
    for (const b of blasts) {
      const age = (now - b.t0) / 1000;
      const big = b.big;
      if (!b.started) {
        b.started = true;
        W.audio.boom(big);
        B.flash(0.06 * big);
      }
      if (age > 2.6) {
        if (!b.scarred) {
          b.scarred = true;
          tctx.globalAlpha = 0.5;
          tctx.fillStyle = colors[b.side];
          tctx.beginPath();
          tctx.arc(b.x, b.y, R * 0.28, 0, Math.PI * 2);
          tctx.fill();
          tctx.globalAlpha = 1;
        }
        continue;
      }
      keep.push(b);
      const r = age < 0.22 ? R * big * (age / 0.22) : R * big * (1 + (age - 0.22) * 0.9);
      const alpha = age < 0.22 ? 1 : Math.max(0, 1 - (age - 0.22) / 2.4);
      // white-hot core
      if (age < 0.9) {
        c.globalAlpha = Math.max(0, 1 - age / 0.9);
        c.fillStyle = colors.blast;
        c.beginPath();
        c.arc(b.x, b.y, Math.min(r, R * big * 0.9), 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = alpha;
      c.strokeStyle = colors[b.side];
      c.lineWidth = 1.6 * dpr;
      c.beginPath();
      c.arc(b.x, b.y, r, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = alpha * 0.35;
      c.beginPath();
      c.arc(b.x, b.y, r * 0.6, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;
    blasts = keep;
  }

  function drawTTT(c, now) {
    const { games, cols } = ttt;
    const rows = Math.ceil(games.length / cols);
    const W_ = canvas.width;
    const H_ = canvas.height;
    const cell = Math.min((W_ * 0.94) / cols, (H_ * 0.86) / rows);
    const ox = (W_ - cell * cols) / 2;
    const oy = (H_ - cell * rows) / 2 + H_ * 0.03;
    const font = Math.round(cell * 0.12);

    games.forEach((game, i) => {
      const gx = ox + (i % cols) * cell + cell * 0.1;
      const gy = oy + Math.floor(i / cols) * cell + cell * 0.1;
      const s = cell * 0.8;
      const q = s / 3;
      c.strokeStyle = colors.fg;
      c.lineWidth = Math.max(1, s * 0.012);
      c.globalAlpha = game.done ? 0.45 : 0.9;
      c.beginPath();
      for (let k = 1; k < 3; k++) {
        c.moveTo(gx + q * k, gy);
        c.lineTo(gx + q * k, gy + s);
        c.moveTo(gx, gy + q * k);
        c.lineTo(gx + s, gy + q * k);
      }
      c.stroke();

      c.lineWidth = Math.max(1.2, s * 0.025);
      game.cells.forEach((v, k) => {
        if (!v) return;
        const cx = gx + q * (k % 3) + q / 2;
        const cy = gy + q * Math.floor(k / 3) + q / 2;
        const r = q * 0.3;
        c.strokeStyle = v === 'X' ? colors.a : colors.b;
        c.beginPath();
        if (v === 'X') {
          c.moveTo(cx - r, cy - r);
          c.lineTo(cx + r, cy + r);
          c.moveTo(cx + r, cy - r);
          c.lineTo(cx - r, cy + r);
        } else {
          c.arc(cx, cy, r, 0, Math.PI * 2);
        }
        c.stroke();
      });

      if (game.done && font >= 7) {
        const label = game.label || 'DRAW';
        c.font = `${Math.max(10, font)}px VT323, monospace`;
        const tw = c.measureText(label).width;
        c.globalAlpha = 0.85;
        c.fillStyle = colors.bg;
        c.fillRect(gx + s / 2 - tw / 2 - font * 0.3, gy + s / 2 - font * 0.6, tw + font * 0.6, font * 1.2);
        c.globalAlpha = 1;
        c.fillStyle = colors.fg;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(label, gx + s / 2, gy + s / 2);
        c.textAlign = 'left';
      }
    });
    c.globalAlpha = 1;
  }

  new ResizeObserver(() => {
    if (B.visible) layout();
  }).observe(boardEl);
})();
