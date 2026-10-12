// The teletype: character-by-character output, a single input line, and "press RETURN to hurry it up".
(function () {
  const W = window.WOPR;
  const A = W.audio;

  const out = document.getElementById('output');
  const inputline = document.getElementById('inputline');
  const typed = document.getElementById('typed');
  const kbd = document.getElementById('kbd');

  const MAX_LINES = 160;
  const MAX_INPUT = 64;

  const T = (W.term = {
    cps: 42, // roughly 300-400 baud, which is how WOPR felt on screen
  });

  let skipping = false; // RETURN during output: finish everything instantly until the next prompt
  let reading = null; // { resolve, prompt }
  let anyKey = null;

  inputline.classList.add('hidden');

  const frame = () => new Promise((r) => requestAnimationFrame(r));

  function addLine(cls) {
    const div = document.createElement('div');
    if (cls) div.className = cls;
    out.appendChild(div);
    while (out.childElementCount > MAX_LINES) out.firstElementChild.remove();
    return div;
  }

  async function typeLine(div, line, cps, sound) {
    const node = document.createTextNode('');
    div.appendChild(node);
    if (skipping || !isFinite(cps) || !line) {
      node.data = line;
      return;
    }
    const start = performance.now();
    let shown = 0;
    while (shown < line.length) {
      await frame();
      const want = skipping ? line.length : Math.min(line.length, Math.floor(((performance.now() - start) / 1000) * cps) + 1);
      if (want > shown) {
        if (sound && !skipping && line[want - 1] !== ' ') A.tick();
        shown = want;
        node.data = line.slice(0, shown);
      }
    }
  }

  // Print one or more lines (split on \n). Resolves when the last character is on screen.
  T.print = async function (text = '', { cps = T.cps, cls = '', sound = true } = {}) {
    for (const line of String(text).split('\n')) {
      await typeLine(addLine(cls), line, cps, sound);
    }
  };

  // Instant print, for lists and status lines.
  T.line = (text = '', cls = '') => T.print(text, { cps: Infinity, cls });

  // Dim out-of-character guidance for players who haven't memorised the film.
  T.hint = (text) => T.print(text, { cps: 120, cls: 'hint', sound: false });

  T.blank = (n = 1) => {
    for (let i = 0; i < n; i++) addLine();
  };

  T.clear = () => {
    out.innerHTML = '';
  };

  // A pause that RETURN can cut short.
  T.pause = async function (ms) {
    const end = performance.now() + ms;
    while (!skipping && performance.now() < end) await W.sleep(Math.min(40, end - performance.now()));
  };

  T.isSkipping = () => skipping;

  // How many characters fit across the terminal (VT323 glyphs are half as wide as they are tall).
  T.columns = () => Math.max(20, Math.floor(out.clientWidth / (parseFloat(getComputedStyle(out).fontSize) * 0.5)));

  T.readLine = function (prompt = '') {
    skipping = false;
    kbd.value = '';
    reading = { prompt };
    render();
    inputline.classList.remove('hidden');
    focus();
    return new Promise((resolve) => (reading.resolve = resolve));
  };

  T.waitKey = function () {
    return new Promise((resolve) => (anyKey = resolve));
  };

  // The burst of garbage when the backdoor opens.
  T.glitch = async function (ms = 1200) {
    const chars = '!"#$%&()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`{|}~';
    const end = performance.now() + ms;
    const width = T.columns();
    while (performance.now() < end) {
      let s = '';
      for (let i = 0; i < width; i++) s += Math.random() < 0.15 ? ' ' : chars[(Math.random() * chars.length) | 0];
      addLine().textContent = s;
      if (Math.random() < 0.5) A.tick();
      await frame();
    }
  };

  function render() {
    typed.textContent = (reading ? reading.prompt : '') + kbd.value;
  }

  function focus() {
    if (document.activeElement !== kbd) kbd.focus({ preventScroll: true });
  }

  function submit() {
    const value = kbd.value.trim();
    const r = reading;
    reading = null;
    inputline.classList.add('hidden');
    addLine('user').textContent = r.prompt + kbd.value;
    kbd.value = '';
    typed.textContent = '';
    r.resolve(value);
  }

  kbd.addEventListener('input', () => {
    if (!reading) {
      kbd.value = '';
      return;
    }
    if (kbd.value.length > MAX_INPUT) kbd.value = kbd.value.slice(0, MAX_INPUT);
    render();
  });

  kbd.addEventListener('keydown', (e) => {
    if (anyKey) {
      const r = anyKey;
      anyKey = null;
      e.preventDefault();
      r();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      A.key();
      if (reading) submit();
      else {
        skipping = true;
        A.hush();
      }
      return;
    }
    if (e.key === 'Escape') {
      skipping = true;
      A.hush();
      return;
    }
    if (reading && (e.key.length === 1 || e.key === 'Backspace')) A.key();
    // Keep the caret pinned to the end, like a real terminal.
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) e.preventDefault();
  });

  document.addEventListener('pointerdown', () => {
    if (anyKey) {
      const r = anyKey;
      anyKey = null;
      r();
    }
    setTimeout(focus, 0);
  });
  document.addEventListener('keydown', (e) => {
    if (e.target !== kbd) focus();
  });
  kbd.addEventListener('blur', () => setTimeout(focus, 0));
  T.focus = focus;
})();
