// Power on, war-dial Sunnyvale, find a carrier, and hand over to the LOGON prompt.
(function () {
  const W = window.WOPR;
  const T = W.term;
  const A = W.audio;
  const B = W.board;
  const J = W.joshua;

  const crt = document.getElementById('crt');
  const power = document.getElementById('power');

  const saved = W.settings.load();
  if (saved.color && saved.color !== 'green') document.documentElement.dataset.color = saved.color;
  if (saved.voice === false) A.voiceOn = false;
  if (saved.sound === false) A.soundOn = false;

  const params = new URLSearchParams(location.search);

  async function powerOn() {
    await new Promise((resolve) => {
      const go = () => {
        // Audio has to start inside the click/keypress itself, or iOS keeps it muted.
        A.init();
        A.ctx && A.ctx.resume();
        window.removeEventListener('keydown', go);
        power.removeEventListener('click', go);
        resolve();
      };
      window.addEventListener('keydown', go);
      power.addEventListener('click', go);
    });
    A.loadVoice('vendor/joshua-voice.js');
    power.classList.add('gone');
    T.focus();
    A.tone(60, 0.25, { type: 'sawtooth', gain: 0.08 });
    crt.classList.replace('off', 'warming');
    await W.sleep(90);
    crt.classList.remove('warming');
    await W.sleep(600);
  }

  async function warDial() {
    T.clear();
    T.hint('(press RETURN to skip)');
    await T.print('AUTODIAL MODEM UTILITY  V2.3\n');
    await T.print('EXCHANGE:   (311) 399-XXXX   SUNNYVALE, CA');
    await T.print('SCANNING 399-2000 THROUGH 399-2999 FOR CARRIER\n');

    const statuses = ['NO ANSWER', 'NO ANSWER', 'NO ANSWER', 'BUSY', 'VOICE', 'NO CARRIER', 'NO ANSWER', 'DISCONNECTED'];
    let n = 2000;
    while (n < 2364 && !T.isSkipping()) {
      n = Math.min(2364, n + W.randInt(3, 22));
      if (n === 2364) break;
      await T.line(`  399-${n}    ${W.pick(statuses)}`);
      await T.pause(W.randInt(50, 140));
    }
    await T.line('  399-2364    CARRIER DETECTED   ***');
    A.beep(1200, 0.08);
    setTimeout(() => A.beep(1200, 0.08), 160);
    await T.pause(900);

    await T.print('\nDIALING 311-399-2364 ...');
    await T.pause(A.dial('3113992364') * 1000);
    await T.print('RINGING ...');
    await T.pause(A.handshake() * 1000);
    if (T.isSkipping()) A.cut();
    await T.print('CONNECT 300');
    await T.pause(1100);
    T.clear();
    await W.sleep(400);
  }

  async function main() {
    await powerOn();
    if (!params.has('skip')) await warDial();
    for (;;) {
      await J.logon();
      try {
        await J.session();
      } catch (e) {
        if (!(e instanceof W.Logoff)) throw e;
        A.hush();
        B.hide();
        T.blank();
        await J.say('GOODBYE, PROFESSOR.');
        await T.print('--CONNECTION TERMINATED--');
        await W.sleep(1600);
      }
    }
  }

  main().catch((e) => {
    console.error(e);
    T.print(`\nSYSTEM FAULT: ${String(e.message || e).toUpperCase()}`, { cls: 'alert' });
  });
})();
