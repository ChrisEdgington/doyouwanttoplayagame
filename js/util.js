// Shared helpers. Everything hangs off window.WOPR so the app runs from file:// with plain <script> tags.
(function () {
  const W = (window.WOPR = window.WOPR || {});

  W.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  W.rand = (a, b) => a + Math.random() * (b - a);
  W.randInt = (a, b) => Math.floor(W.rand(a, b + 1));
  W.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  W.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Lowercase, strip punctuation, collapse whitespace: what the dialogue matcher compares against.
  W.norm = (s) =>
    s
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9 -]+/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  W.settings = {
    load() {
      try {
        return JSON.parse(localStorage.getItem('wopr.settings')) || {};
      } catch {
        return {};
      }
    },
    save(patch) {
      const next = { ...W.settings.load(), ...patch };
      try {
        localStorage.setItem('wopr.settings', JSON.stringify(next));
      } catch {}
      return next;
    },
  };

  // Thrown out of any prompt when the user logs off; unwinds back to LOGON.
  W.Logoff = class Logoff extends Error {};
})();
