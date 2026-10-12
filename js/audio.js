// Sound effects are synthesized with WebAudio (no sample files): key clicks, modem, klaxon, launches, blasts.
// Joshua's voice is played from recorded words; see the voice section below.
(function () {
  const W = window.WOPR;

  const A = (W.audio = {
    ctx: null,
    master: null,
    soundOn: true,
    voiceOn: true,
    voice: null,
  });

  A.init = function () {
    if (A.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    A.ctx = new Ctx();
    // iPhones mute web audio when the ring/silent switch is on silent unless the page asks for playback.
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch {}
    A.master = A.ctx.createGain();
    A.master.gain.value = 0.55;
    A.out = A.ctx.createDynamicsCompressor();
    A.out.connect(A.ctx.destination);
    A.master.connect(A.out);
    A.noiseBuf = makeNoise(A.ctx, 2);
    pickVoice();
    if (window.speechSynthesis) speechSynthesis.onvoiceschanged = pickVoice;
  };

  function makeNoise(ctx, seconds) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  const live = () => A.ctx && A.soundOn;
  const now = () => A.ctx.currentTime;

  function env(gainNode, t, attack, hold, release, peak) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(peak, t + attack);
    g.setValueAtTime(peak, t + attack + hold);
    g.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  }

  A.tone = function (freq, dur, { type = 'sine', gain = 0.2, at = 0, attack = 0.005, release = 0.03 } = {}) {
    if (!live()) return;
    const t = now() + at;
    const o = A.ctx.createOscillator();
    const g = A.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    env(g, t, attack, Math.max(0, dur - attack - release), release, gain);
    o.connect(g).connect(A.master);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  };

  function noise({ at = 0, dur = 0.1, gain = 0.2, filter = 'bandpass', freq = 2000, q = 1, attack = 0.002, release = 0.05 }) {
    const t = now() + at;
    const src = A.ctx.createBufferSource();
    src.buffer = A.noiseBuf;
    src.loop = true;
    const f = A.ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    f.Q.value = q;
    const g = A.ctx.createGain();
    env(g, t, attack, Math.max(0, dur - attack - release), release, gain);
    src.connect(f).connect(g).connect(A.master);
    src.start(t, Math.random());
    src.stop(t + dur + 0.1);
    return { src, f, g, t };
  }

  // Mechanical key click for the user's typing.
  A.key = function () {
    if (!live()) return;
    noise({ dur: 0.025, gain: 0.25, filter: 'highpass', freq: 2500, q: 0.7, release: 0.02 });
    A.tone(140, 0.02, { type: 'square', gain: 0.03 });
  };

  // Faint printhead tick for terminal output.
  A.tick = function () {
    if (!live()) return;
    noise({ dur: 0.012, gain: 0.05, filter: 'bandpass', freq: 3800, q: 3, release: 0.008 });
  };

  A.beep = function (freq = 880, dur = 0.09) {
    A.tone(freq, dur, { type: 'square', gain: 0.07 });
  };

  const DTMF = {
    1: [697, 1209], 2: [697, 1336], 3: [697, 1477],
    4: [770, 1209], 5: [770, 1336], 6: [770, 1477],
    7: [852, 1209], 8: [852, 1336], 9: [852, 1477],
    '*': [941, 1209], 0: [941, 1336], '#': [941, 1477],
  };

  // Dial a number with touch tones. Returns seconds taken.
  A.dial = function (number) {
    const digits = [...number].filter((c) => c in DTMF);
    if (live()) {
      A.tone(350, 1.0, { gain: 0.06 });
      A.tone(440, 1.0, { gain: 0.06 });
      digits.forEach((d, i) => {
        const at = 1.1 + i * 0.13;
        A.tone(DTMF[d][0], 0.08, { gain: 0.09, at });
        A.tone(DTMF[d][1], 0.08, { gain: 0.09, at });
      });
    }
    return 1.1 + digits.length * 0.13;
  };

  // Ringback, answer tone, and a 300 baud Bell 103 style carrier warble.
  A.handshake = function () {
    const total = 5.2;
    if (!live()) return total;
    for (const at of [0.2, 2.2]) {
      A.tone(440, 1.2, { gain: 0.05, at });
      A.tone(480, 1.2, { gain: 0.05, at });
    }
    A.tone(2225, 1.4, { gain: 0.08, at: 3.4, release: 0.02 });
    // FSK warble: hop between mark/space on both carriers.
    const t0 = now() + 3.6;
    const o1 = A.ctx.createOscillator();
    const o2 = A.ctx.createOscillator();
    const g = A.ctx.createGain();
    o1.type = o2.type = 'sine';
    for (let i = 0; i < 160; i++) {
      const t = t0 + i * 0.01;
      o1.frequency.setValueAtTime(Math.random() < 0.5 ? 1070 : 1270, t);
      o2.frequency.setValueAtTime(Math.random() < 0.5 ? 2025 : 2225, t);
    }
    env(g, t0, 0.02, 1.4, 0.15, 0.06);
    o1.connect(g);
    o2.connect(g);
    g.connect(A.master);
    o1.start(t0);
    o2.start(t0);
    o1.stop(t0 + 1.7);
    o2.stop(t0 + 1.7);
    noise({ at: 3.6, dur: 1.5, gain: 0.03, filter: 'bandpass', freq: 1800, q: 0.5 });
    return total;
  };

  A.klaxon = function (cycles = 3) {
    if (!live()) return;
    for (let i = 0; i < cycles; i++) {
      const t = now() + i * 0.9;
      const o = A.ctx.createOscillator();
      const g = A.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(380, t);
      o.frequency.linearRampToValueAtTime(760, t + 0.6);
      env(g, t, 0.03, 0.5, 0.2, 0.07);
      const f = A.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 2200;
      o.connect(f).connect(g).connect(A.master);
      o.start(t);
      o.stop(t + 0.85);
    }
  };

  let lastLaunch = 0;
  A.launch = function () {
    if (!live() || now() - lastLaunch < 0.06) return;
    lastLaunch = now();
    const n = noise({ dur: 1.1, gain: 0.07, filter: 'bandpass', freq: 400, q: 1.5, attack: 0.15, release: 0.6 });
    n.f.frequency.exponentialRampToValueAtTime(2400, n.t + 1.0);
  };

  let lastBoom = 0;
  A.boom = function (big = 1) {
    if (!live() || now() - lastBoom < 0.05) return;
    lastBoom = now();
    const n = noise({ dur: 1.6 * big, gain: 0.35 * Math.min(1, big), filter: 'lowpass', freq: 900, q: 0.3, attack: 0.005, release: 1.3 * big });
    n.f.frequency.exponentialRampToValueAtTime(80, n.t + 1.4 * big);
    const t = now();
    const o = A.ctx.createOscillator();
    const g = A.ctx.createGain();
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 1.2);
    env(g, t, 0.005, 0.1, 1.2, 0.35);
    o.connect(g).connect(A.master);
    o.start(t);
    o.stop(t + 1.5);
  };

  // A low drone that sits under the finale montage. Returns a stop() function.
  A.drone = function () {
    if (!live()) return () => {};
    const t = now();
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 2);
    const oscs = [55, 55.4, 110.3].map((f) => {
      const o = A.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(g);
      o.start(t);
      return o;
    });
    const f = A.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 400;
    g.connect(f).connect(A.master);
    return () => {
      const s = now();
      g.gain.cancelScheduledValues(s);
      g.gain.setValueAtTime(g.gain.value, s);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.05);
      oscs.forEach((o) => o.stop(s + 0.1));
    };
  };

  // ---------- voice ----------

  // Joshua speaks from a bank of single-word recordings (vendor/joshua-voice.js, built by
  // tools/build-voice.mjs), joined back to back. That's how the film got its flat delivery: John Wood
  // read the lines one word at a time and the words were edited back together. Every device plays
  // the same recordings; the browser's own speech is only a fallback for unrecorded words.

  const SENTENCE_PAUSE = 0.35;
  const bankCache = new Map(); // word -> Promise<AudioBuffer>
  let voiceChain = null;
  let voiceJob = null;

  let bankLoaded;
  A.voiceReady = new Promise((r) => (bankLoaded = r));
  A.loadVoice = function (src) {
    if (window.JOSHUA_VOICE) return bankLoaded(true);
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => bankLoaded(true);
    s.onerror = () => bankLoaded(false);
    document.head.appendChild(s);
  };

  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const ORD = { one: 'first', two: 'second', three: 'third', four: 'fourth', five: 'fifth', six: 'sixth', seven: 'seventh', eight: 'eighth', nine: 'ninth', ten: 'tenth', twenty: 'twentieth', thirty: 'thirtieth' };

  function cardinal(n) {
    if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
    if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + cardinal(n % 100) : '');
    if (n < 1e6) return cardinal(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + cardinal(n % 1000) : '');
    return cardinal(Math.floor(n / 1e6)) + ' million' + (n % 1e6 ? ' ' + cardinal(n % 1e6) : '');
  }

  function ordinal(n) {
    const words = cardinal(n).split(' ');
    const last = words.pop();
    return [...words, ORD[last] || last].join(' ');
  }

  // Text as Joshua would say it: numbers spelled out, then words and sentence breaks.
  function spokenWords(text) {
    const t = text
      .replace(/W\.O\.P\.R\./g, 'WHOPPER')
      .replace(/\bWOPR\b/g, 'WHOPPER')
      .replace(/(\d),(?=\d{3}\b)/g, '$1')
      .replace(/\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER) (\d{1,2})\b/gi, (_, m, d) => `${m} ${ordinal(+d)}`)
      .replace(/\b19(\d\d)\b/g, (_, yy) => `nineteen ${cardinal(+yy)}`)
      .replace(/\d+/g, (d) => cardinal(+d))
      .toLowerCase()
      .replace(/[’]/g, "'");
    return t.match(/[a-z]+(?:'[a-z]+)?|[.?!]+/g) || [];
  }

  function decodeWord(word) {
    if (!bankCache.has(word)) {
      const b64 = window.JOSHUA_VOICE[word];
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      bankCache.set(
        word,
        new Promise((resolve, reject) => A.ctx.decodeAudioData(bytes.buffer, resolve, reject)).then(trimPadding)
      );
    }
    return bankCache.get(word);
  }

  // MP3 decoders add a little silence at each end; shave it so words butt together.
  function trimPadding(buf) {
    const d = buf.getChannelData(0);
    const quiet = 0.004;
    let a = 0;
    let b = d.length - 1;
    while (a < b && Math.abs(d[a]) < quiet) a++;
    while (b > a && Math.abs(d[b]) < quiet) b--;
    const out = A.ctx.createBuffer(1, Math.max(1, b - a + 1), buf.sampleRate);
    out.copyToChannel(d.subarray(a, b + 1), 0);
    return out;
  }

  // The electronic treatment: a small speaker's band, a slow metallic flange and a short slapback.
  function buildVoiceChain(ctx, dest) {
    const input = ctx.createGain();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 180;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3800;
    input.connect(hp).connect(lp);

    const mix = ctx.createGain();
    lp.connect(mix);
    const flange = ctx.createDelay(0.05);
    flange.delayTime.value = 0.0021;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.15;
    const depth = ctx.createGain();
    depth.gain.value = 0.0006;
    lfo.connect(depth).connect(flange.delayTime);
    lfo.start();
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    const wet = ctx.createGain();
    wet.gain.value = 0.6;
    lp.connect(flange);
    flange.connect(feedback).connect(flange);
    flange.connect(wet).connect(mix);

    const out = ctx.createGain();
    out.gain.value = 1.1;
    const echo = ctx.createDelay(0.1);
    echo.delayTime.value = 0.014;
    const echoGain = ctx.createGain();
    echoGain.gain.value = 0.25;
    mix.connect(out);
    mix.connect(echo).connect(echoGain).connect(out);
    out.connect(dest);
    return input;
  }

  // Queue the words on `ctx` starting at `t0`. Returns the sources and when the last one ends.
  async function scheduleWords(tokens, ctx, input, t0) {
    const bufs = await Promise.all(tokens.map((w) => (/^[.?!]/.test(w) ? null : decodeWord(w))));
    let t = t0;
    const sources = [];
    bufs.forEach((buf, i) => {
      if (!buf) {
        if (bufs.slice(i + 1).some(Boolean)) t += SENTENCE_PAUSE;
        return;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(input);
      src.start(t);
      sources.push(src);
      t += buf.duration;
    });
    return { sources, end: t };
  }

  async function speakBank(tokens) {
    if (!voiceChain) voiceChain = buildVoiceChain(A.ctx, A.out);
    if (A.ctx.state === 'suspended') await A.ctx.resume();
    const { sources, end } = await scheduleWords(tokens, A.ctx, voiceChain, A.ctx.currentTime + 0.05);
    return new Promise((resolve) => {
      const job = { sources, resolve };
      voiceJob = job;
      setTimeout(() => {
        if (voiceJob === job) voiceJob = null;
        resolve();
      }, (end - A.ctx.currentTime) * 1000 + 50);
    });
  }

  A.speak = async function (text) {
    if (!A.voiceOn) return;
    const tokens = spokenWords(text);
    if (!tokens.length) return;
    const ready = A.ctx && (await Promise.race([A.voiceReady, W.sleep(4000).then(() => false)]));
    const missing = ready ? tokens.filter((w) => !/^[.?!]/.test(w) && !window.JOSHUA_VOICE[w]) : tokens;
    if (!missing.length) {
      try {
        return await speakBank(tokens);
      } catch (e) {
        console.warn('Joshua voice playback failed, using system speech', e);
      }
    } else if (ready) {
      console.warn('Joshua has no recording for:', missing.join(' '), '(run node tools/build-voice.mjs)');
    }
    return speakSystem(tokens.join(' '));
  };

  // Render a line through the same chain into a WAV blob, for checking the voice outside the game.
  A.renderVoiceWav = async function (text) {
    await A.voiceReady;
    const tokens = spokenWords(text);
    const probe = await scheduleWords(tokens, A.ctx, A.ctx.createGain(), 0);
    probe.sources.forEach((s) => s.disconnect());
    const rate = 44100;
    const off = new OfflineAudioContext(1, Math.ceil((probe.end + 0.3) * rate), rate);
    const input = buildVoiceChain(off, off.destination);
    await scheduleWords(tokens, off, input, 0.05);
    const pcm = (await off.startRendering()).getChannelData(0);
    const view = new DataView(new ArrayBuffer(44 + pcm.length * 2));
    const str = (o, s) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF'); view.setUint32(4, 36 + pcm.length * 2, true); str(8, 'WAVEfmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    str(36, 'data'); view.setUint32(40, pcm.length * 2, true);
    pcm.forEach((v, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 0x7fff, true));
    return new Blob([view], { type: 'audio/wav' });
  };

  // ---------- fallback: the browser's own speech ----------

  function pickVoice() {
    if (!window.speechSynthesis) return;
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return;
    A.voice =
      voices.find((v) => v.name === 'Daniel' || v.name.startsWith('Daniel ')) ||
      voices.find((v) => /^en[-_]GB/i.test(v.lang)) ||
      voices.find((v) => /^en/i.test(v.lang)) ||
      voices[0];
  }

  function speakSystem(spoken) {
    if (!window.speechSynthesis) return Promise.resolve();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(spoken);
      if (A.voice) u.voice = A.voice;
      u.rate = 0.85;
      u.pitch = 0.8;
      let done = false;
      const finish = () => {
        if (!done) (done = true), resolve();
      };
      u.onend = finish;
      u.onerror = finish;
      // Some browsers never fire onend; don't let that hang the conversation.
      setTimeout(finish, 1500 + spoken.length * 110);
      speechSynthesis.speak(u);
    });
  }

  // Kill every sound that is playing or scheduled (used when RETURN skips a sequence).
  A.cut = function () {
    if (!A.ctx) return;
    A.master.disconnect();
    A.master = A.ctx.createGain();
    A.master.gain.value = 0.55;
    A.master.connect(A.out);
  };

  A.hush = function () {
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (voiceJob) {
      voiceJob.sources.forEach((src) => {
        try {
          src.stop();
        } catch {}
      });
      voiceJob.resolve();
      voiceJob = null;
    }
  };
})();
