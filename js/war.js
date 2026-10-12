// Global Thermonuclear War: the player's game, and the accelerating scenario montage of the finale.
(function () {
  const W = window.WOPR;
  const T = W.term;
  const A = W.audio;
  const B = W.board;

  const war = (W.war = {});

  const fmt = (millions) => Math.round(millions * 1e6).toLocaleString('en-US');
  const uniq = (xs) => [...new Set(xs)];

  // Each simulated minute is 200ms of real time, so a 30-minute ICBM flight takes about six seconds.
  const clockText = (ms) => {
    const s = Math.floor(ms * 0.3);
    const p = (n) => String(n).padStart(2, '0');
    return `T+${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
  };

  // Tracks who has died where. Cities hit twice lose a share of whoever is left.
  function makeTally(labelA, labelB) {
    const left = new Map();
    const dead = { a: 0, b: 0 };
    const render = () => {
      B.setHud('a', `${labelA}  ${fmt(dead.a)}`);
      B.setHud('b', `${fmt(dead.b)}  ${labelB}`);
    };
    render();
    return {
      dead,
      hit(city, victim) {
        const pop = left.has(city.name) ? left.get(city.name) : city.pop * 1.15;
        const kill = pop * W.rand(0.45, 0.8) + W.rand(0.02, 0.15);
        left.set(city.name, Math.max(0, pop - kill));
        dead[victim] += kill;
        render();
      },
    };
  }

  function flightTime(from, to, base) {
    const d = Math.hypot(from[0] - to.lat, ((from[1] - to.lon + 540) % 360) - 180);
    return base * (0.55 + Math.min(1, d / 120) * 0.6) * W.rand(0.9, 1.15);
  }

  function pickWeighted(cities) {
    const total = cities.reduce((s, c) => s + Math.sqrt(c.pop) + 0.3, 0);
    let r = Math.random() * total;
    for (const c of cities) {
      r -= Math.sqrt(c.pop) + 0.3;
      if (r <= 0) return c;
    }
    return cities[cities.length - 1];
  }

  // Fire from a random site of one of `factions` at `city`. side is 'a' or 'b' (the shooter's colour).
  function fire({ factions, city, side, base, tally, victim, big = 1, token }) {
    const shooters = factions.filter((f) => W.sitesFor(f).length);
    if (!shooters.length) return Promise.resolve(false);
    // The superpowers carry most of the arsenal.
    const f = shooters.find((x) => (x === 'US' || x === 'SU') && Math.random() < 0.7) || W.pick(shooters);
    const from = W.pick(W.sitesFor(f));
    return B.launch({
      from,
      to: [city.lat, city.lon],
      side,
      big,
      dur: flightTime(from, city, base),
      onImpact: () => {
        if (token && token.dead) return;
        tally.hit(city, victim);
      },
    });
  }

  function salvo(n, opts) {
    const { targets, stagger = 120, token } = opts;
    if (!targets.length) return;
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        if (token && token.dead) return;
        fire({ ...opts, city: pickWeighted(targets) });
      }, i * stagger * W.rand(0.5, 1.5));
    }
  }

  async function waitForQuiet(maxMs = 15000) {
    const end = performance.now() + maxMs;
    while (B.inFlight() && performance.now() < end) await W.sleep(100);
  }

  // ---------- the player's game ----------

  war.play = async function (ask, say) {
    T.clear();
    B.clear();
    B.show('split');
    B.hud({ title: 'GLOBAL THERMONUCLEAR WAR', defcon: 5 });
    await W.sleep(700);

    await T.print('WHICH SIDE DO YOU WANT?\n\n     1.    UNITED STATES\n     2.    SOVIET UNION\n');
    let me = null;
    while (!me) {
      const q = W.norm(await ask('PLEASE CHOOSE ONE:  '));
      if (/^(1|us|usa|u s|u s a|united states|america|nato|west)\b/.test(q)) me = 'US';
      else if (/^(2|ussr|u s s r|soviet|soviets|soviet union|russia|cccp|east)\b/.test(q)) me = 'SU';
      else await T.print('PLEASE CHOOSE 1 OR 2.');
    }
    const them = me === 'US' ? 'SU' : 'US';
    const mine = W.blocs[me];
    const theirs = W.blocs[them];

    T.clear();
    await T.print('AWAITING FIRST STRIKE COMMAND\n-----------------------------\n\nPLEASE LIST PRIMARY TARGETS BY\nCITY AND/OR COUNTY NAME:\n');
    await T.hint('(one or more per line, comma separated. LIST shows the target database. Blank line to launch.)');

    const targets = [];
    for (;;) {
      const raw = await ask('');
      const q = W.norm(raw);
      if (!q || /^(done|launch|go|fire|execute|end)$/.test(q)) {
        if (targets.length) break;
        await T.print('NO TARGETS SPECIFIED. SELECTING DEFAULT TARGET PACKAGE.');
        for (const c of W.citiesOf([them]).sort((x, y) => y.pop - x.pop).slice(0, 4)) {
          targets.push(c);
          B.mark(c, 'b');
          await T.line(`   ${c.name.padEnd(22, '.')} TARGETED`);
        }
        break;
      }
      if (q === 'list' || q === 'list targets') {
        await printTargets(theirs);
        continue;
      }
      for (const part of raw.split(/,|;|\band\b|\//i)) {
        if (!part.trim()) continue;
        const city = W.findCity(part);
        if (!city) await T.print(`   TARGET NOT IN DATABASE: ${part.trim().toUpperCase()}`);
        else if (mine.includes(city.faction)) await T.print(`   ${city.name} IS A FRIENDLY CITY. TARGET REJECTED.`);
        else if (targets.includes(city)) await T.print(`   ${city.name} ALREADY TARGETED.`);
        else if (targets.length >= 12) await T.print('   MAXIMUM FIRST STRIKE PACKAGE IS 12 TARGETS.');
        else {
          targets.push(city);
          B.mark(city, 'b');
          A.beep(1200, 0.05);
          await T.line(`   ${city.name.padEnd(22, '.')} TARGETED`);
        }
      }
    }

    await T.print('\nFIRST STRIKE AUTHORIZED.  LAUNCH SEQUENCE INITIATED.');
    await W.sleep(900);
    await simulate({ me, them, mine, theirs, targets });
    return true;
  };

  async function printTargets(factions) {
    const names = W.citiesOf(factions).map((c) => c.name);
    const colW = 18;
    const cols = Math.max(2, Math.min(5, Math.floor(T.columns() / colW)));
    let row = '';
    const lines = [];
    names.forEach((n, i) => {
      row += n.padEnd(colW);
      if ((i + 1) % cols === 0) {
        lines.push(row);
        row = '';
      }
    });
    if (row) lines.push(row);
    await T.print(lines.join('\n'), { cps: 400 });
  }

  async function simulate({ me, them, mine, theirs, targets }) {
    const start = performance.now();
    const tally = makeTally(W.factions[me].name, W.factions[them].name);
    const token = { dead: false };
    const clock = setInterval(() => B.setHud('clock', clockText(performance.now() - start)), 250);
    const base = 6200;

    try {
      B.setHud('defcon', 3);
      // Wave 1: the player's first strike.
      targets.forEach((city, i) =>
        setTimeout(() => {
          if (token.dead) return;
          fire({ factions: [me], city, side: 'a', base, tally, victim: 'b', token }).then((hit) => {
            if (hit) T.line(`   ${city.name.padEnd(22, '.')} DESTROYED`);
          });
        }, i * 260)
      );
      await T.pause(2400);

      // Wave 2: they see it coming.
      B.setHud('defcon', 2);
      A.klaxon(3);
      await T.print('*** ENEMY LAUNCH DETECTED ***', { cls: 'alert' });
      salvo(Math.max(4, targets.length * 2), { factions: [them], targets: W.citiesOf(mine), side: 'b', base, tally, victim: 'a', token, stagger: 160 });
      await T.pause(1600);
      await T.print(`TRAJECTORY ANALYSIS: ${W.factions[me].name} PRIMARY TARGETS`);
      await T.pause(2600);

      // Waves 3+: automated escalation. Nobody is steering any more.
      B.setHud('defcon', 1);
      A.klaxon(2);
      await T.print('DEFCON 1.  SECOND STRIKE AUTHORIZED.', { cls: 'alert' });
      const allies = { a: uniq([me, ...mine]), b: uniq([them, ...theirs]) };
      for (const [i, n] of [10, 16, 22, 30].entries()) {
        salvo(n, { factions: allies.a, targets: W.citiesOf(allies.b), side: 'a', base, tally, victim: 'b', token, stagger: 90 });
        salvo(n, { factions: allies.b, targets: W.citiesOf(allies.a), side: 'b', base, tally, victim: 'a', token, stagger: 90 });
        await T.print(['RETALIATORY STRIKE IN PROGRESS', 'COUNTERFORCE TARGETING EXHAUSTED', 'COUNTERVALUE TARGETS RELEASED', 'ALL REMAINING FORCES COMMITTED'][i]);
        await T.pause(2300);
      }

      await waitForQuiet();
      await W.sleep(1800);
      B.flash(0.5);
      A.beep(220, 0.6);
      B.big('WINNER: NONE');
      await T.print(`\nTOTAL CASUALTIES:  ${fmt(tally.dead.a + tally.dead.b)}\nWINNER: NONE`);
    } finally {
      token.dead = true;
      clearInterval(clock);
    }
  }

  // ---------- the finale montage ----------

  function escalate(a, b) {
    const withPatrons = (fs) => uniq(fs.flatMap((f) => [f, W.factions[f].patron].filter(Boolean)));
    const A2 = withPatrons(a);
    const B2 = withPatrons(b).filter((f) => !A2.includes(f));
    if (A2.includes('US') && !B2.includes('SU')) B2.push('SU');
    else if (A2.includes('SU') && !B2.includes('US')) B2.push('US');
    else if (!A2.includes('US') && !A2.includes('SU')) {
      if (B2.includes('US')) A2.push('SU');
      else if (B2.includes('SU')) A2.push('US');
      else A2.push('SU'), B2.push('US');
    }
    return [A2, B2.filter((f) => !A2.includes(f))];
  }

  function label(fs) {
    return fs.map((f) => W.factions[f].name).join(' / ');
  }

  function runScenario(sc, dur, token) {
    const tally = makeTally(label(sc.a), label(sc.b));
    const base = Math.max(260, Math.min(5200, dur * 0.42));
    const [ea, eb] = escalate(sc.a, sc.b);
    const scale = Math.max(0.35, Math.min(1, dur / 4000));
    const at = (frac, fn) => setTimeout(() => !token.dead && fn(), dur * frac);

    at(0, () => salvo(W.randInt(3, 6), { factions: sc.a, targets: W.citiesOf(sc.b), side: 'a', base, tally, victim: 'b', token, stagger: 60 * scale }));
    at(0.12, () => salvo(W.randInt(4, 8), { factions: sc.b, targets: W.citiesOf(sc.a), side: 'b', base, tally, victim: 'a', token, stagger: 60 * scale }));
    at(0.25, () => {
      const n = Math.round(14 + 14 * scale);
      salvo(n, { factions: ea, targets: W.citiesOf(eb), side: 'a', base, tally, victim: 'b', token, stagger: 30 * scale });
      salvo(n, { factions: eb, targets: W.citiesOf(ea), side: 'b', base, tally, victim: 'a', token, stagger: 30 * scale });
    });
  }

  war.montage = async function () {
    const scenarios = W.scenarios;
    let dur = 6500;
    let token = { dead: true };
    const play = async (sc, d) => {
      token.dead = true;
      token = { dead: false };
      B.clear();
      B.big(null);
      B.hud({ title: sc.name, defcon: 1, clock: '' });
      runScenario(sc, d, token);
      await W.sleep(d);
      B.big('WINNER: NONE');
      A.beep(330, Math.min(0.2, d / 4000));
      await W.sleep(Math.max(110, d * 0.16));
    };

    for (const sc of scenarios) {
      await play(sc, dur);
      dur = Math.max(320, dur * 0.76);
    }
    for (let i = 0; i < 18; i++) {
      await play(W.pick(scenarios), Math.max(150, 300 - i * 10));
    }
    token.dead = true;
    B.clear();
    B.big(null);
  };
})();
