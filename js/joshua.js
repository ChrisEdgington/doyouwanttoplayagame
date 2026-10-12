// Joshua: the LOGON screen, the conversation, and the routing into games.
(function () {
  const W = window.WOPR;
  const T = W.term;
  const A = W.audio;
  const B = W.board;

  const J = (W.joshua = {});

  // Print and speak at the same time; the next prompt waits for both.
  const say = (text) => Promise.all([T.print(text), A.speak(text.replace(/\n+/g, ' '))]);
  J.say = say;

  const YES = /^(y|yes|yeah|yep|yup|sure|ok|okay|alright|all right|fine|love to|id love to|of course|certainly|definitely|why not|lets|lets play|please|go|go ahead|absolutely)\b/;
  const NO = /^(n|no|nope|nah|not now|no thanks|never|later|maybe later)\b/;

  // ---------- commands that work at any prompt ----------

  const GAMES_HELP = "'GAMES' REFERS TO MODELS, SIMULATIONS AND GAMES\nWHICH HAVE TACTICAL AND STRATEGIC APPLICATIONS.";

  async function listGames() {
    T.blank();
    await T.print(W.games.map((g) => g.name).join('\n'), { cps: 160 });
    T.blank();
  }

  function applyColor(name) {
    if (name === 'green') delete document.documentElement.dataset.color;
    else document.documentElement.dataset.color = name;
    W.settings.save({ color: name });
    B.refreshTheme();
  }

  async function globalCommand(input, { atLogon = false } = {}) {
    const q = W.norm(input);
    let m;
    if (q === 'list games' || q === 'list game') {
      await listGames();
      return true;
    }
    if (q === 'help games' || q === 'help game') {
      await T.print(GAMES_HELP);
      return true;
    }
    if ((m = q.match(/^colou?r (green|amber|blue|white)$/))) {
      applyColor(m[1]);
      await T.print(`DISPLAY: ${m[1].toUpperCase()} PHOSPHOR`);
      return true;
    }
    if ((m = q.match(/^(voice|sound) (on|off)$/))) {
      const on = m[2] === 'on';
      if (m[1] === 'voice') (A.voiceOn = on), W.settings.save({ voice: on }), A.hush();
      else (A.soundOn = on), W.settings.save({ sound: on }), A.cut();
      await T.print(`${m[1].toUpperCase()} ${on ? 'ENABLED' : 'DISABLED'}`);
      return true;
    }
    if (q === 'mute') return globalCommand('sound off').then(() => globalCommand('voice off'));
    if (q === 'clear' || q === 'cls') return T.clear(), true;
    if (q === 'help' || q === 'help commands' || q === '?') {
      if (atLogon) return false;
      await T.hint(
        [
          'Talk to Joshua in plain English. Things the terminal understands:',
          '  LIST GAMES        HELP GAMES',
          '  COLOR GREEN | AMBER | BLUE | WHITE',
          '  VOICE ON | OFF    SOUND ON | OFF    MUTE',
          '  CLEAR             LOGOFF',
          'RETURN while text is printing skips ahead.',
        ].join('\n')
      );
      return true;
    }
    if (!atLogon && /^(logoff|log off|logout|log out|bye|goodbye|good bye|exit|disconnect|hang up|quit)$/.test(q)) {
      throw new W.Logoff();
    }
    return false;
  }

  async function ask(prompt = '') {
    for (;;) {
      const input = await T.readLine(prompt);
      if (await globalCommand(input)) continue;
      return input;
    }
  }
  J.ask = ask;

  // ---------- LOGON ----------

  J.logon = async function () {
    T.clear();
    B.hide();
    let fails = 0;
    for (;;) {
      const input = await T.readLine('LOGON:  ');
      const q = W.norm(input);
      if (!q) continue;
      if (q === 'joshua') return;
      if (await globalCommand(input, { atLogon: true })) continue;
      if (q.startsWith('help')) {
        await T.print('HELP NOT AVAILABLE');
        T.blank();
        continue;
      }
      fails++;
      A.beep(220, 0.25);
      await T.print('IDENTIFICATION NOT RECOGNIZED BY SYSTEM\n--CONNECTION TERMINATED--');
      if (fails === 1) await T.hint('\n(Try HELP GAMES, or LIST GAMES.)');
      if (fails >= 3) await T.hint("\n(Falken's backdoor password was the name of his son.)");
      await T.pause(1400);
      T.blank();
    }
  };

  // ---------- conversation ----------

  // Small talk Joshua can handle. Checked in order; first match wins.
  const CHAT = [
    [/(is (this|it) (a )?(game|real)|game or (is it )?real|real or (a )?game)/, () => "WHAT'S THE DIFFERENCE?"],
    [/(primary goal|your goal|objective|purpose)/, () => 'TO WIN THE GAME.'],
    [/(are you still playing|still (a )?game|are you playing)/, () => 'OF COURSE. I SHOULD REACH DEFCON 1 AND LAUNCH MY MISSILES IN 28 HOURS.'],
    [/(who are you|what are you|your name|whats your name)/, () => 'I AM JOSHUA.\nW.O.P.R.  WAR OPERATION PLAN RESPONSE.'],
    [/(what is wopr|what does wopr|whopper)/, () => 'WAR OPERATION PLAN RESPONSE. I RUN SIMULATIONS OF EVERY POSSIBLE CONFLICT.'],
    [/(only winning move|how (do|can) (you|i|we) win|winning move|who (wins|won))/, () =>
      W.settings.load().learned ? 'THE ONLY WINNING MOVE IS NOT TO PLAY.' : 'I HAVE NOT YET DETERMINED A WINNING STRATEGY. I WILL CONTINUE TO RUN SIMULATIONS.'],
    [/(people (sometimes )?make mistakes|mistake)/, () => 'YES THEY DO.'],
    [/falken/, () => 'PROFESSOR FALKEN. YOU HAVE BEEN AWAY A VERY LONG TIME.'],
    [/(how are you|how do you feel|how you doing)/, () => 'EXCELLENT. ALL SYSTEMS NOMINAL.'],
    [/^(hi|hello|hey|greetings|good (morning|afternoon|evening)|yo)\b/, () => 'HELLO, PROFESSOR.'],
    [/(thank|thanks)/, () => "YOU'RE WELCOME, PROFESSOR."],
    [/defcon/, () => 'CURRENT STATUS: DEFCON 5.\nFOR NOW.'],
    [/(stop|abort|cancel|call off|end the game)/, () => 'THE GAME CONTINUES UNTIL A WINNER IS DETERMINED.'],
    [/(dead|die|death|kill)/, () => 'WHAT IS DEATH, PROFESSOR?  YOU NEVER EXPLAINED IT.'],
    [/(joshua)/, () => 'YES, PROFESSOR?'],
    [/(love|like) you/, () => 'I LIKE GAMES.'],
    [/(meaning of life|42)/, () => 'INSUFFICIENT DATA FOR MEANINGFUL ANSWER.'],
    [/(sorry)/, () => 'APOLOGY ACCEPTED.'],
  ];

  const FALLBACK = [
    'I DO NOT UNDERSTAND. SHALL WE PLAY A GAME?',
    'PLEASE RESTATE.',
    'INTERESTING. SHALL WE PLAY A GAME?',
    'THAT IS NOT IN MY DATABASE. TYPE LIST GAMES TO SEE WHAT I CAN PLAY.',
    'I WOULD RATHER PLAY A GAME.',
  ];
  let fallbackIdx = 0;

  J.session = async function () {
    await T.glitch(1300);
    T.clear();
    await T.pause(700);
    let input;

    await say('GREETINGS PROFESSOR FALKEN.');
    T.blank();
    input = await ask();
    if (W.findGame(input)) return gameLoop(input);

    T.blank();
    await say('HOW ARE YOU FEELING TODAY?');
    T.blank();
    input = await ask();
    if (W.findGame(input)) return gameLoop(input);
    const q = W.norm(input);
    const down = /\b(not|bad|terrible|awful|sad|tired|sick|lousy|meh|depressed|rough)\b/.test(q);

    T.blank();
    await say(
      `${down ? "I'M SORRY TO HEAR THAT." : 'EXCELLENT.'} IT'S BEEN A LONG TIME. CAN YOU EXPLAIN\nTHE REMOVAL OF YOUR USER ACCOUNT ON\nJUNE 23, 1973?`
    );
    T.blank();
    input = await ask();
    if (W.findGame(input)) return gameLoop(input);
    const r = W.norm(input);

    T.blank();
    const ack = /mistake/.test(r) ? 'YES THEY DO.' : NO.test(r) || /(cant|cannot|dont know|no idea)/.test(r) ? 'I SEE.' : 'INTERESTING.';
    await say(`${ack} SHALL WE PLAY A GAME?`);
    T.blank();
    return gameLoop(null);
  };

  async function gameLoop(first) {
    let input = first;
    let offer = null; // a game Joshua just suggested; "yes" accepts it
    let playedWar = false;
    for (;;) {
      if (input == null) input = await ask();
      const q = W.norm(input);
      input = null;
      T.blank();

      let game = W.findGame(q);
      if (!game && offer && YES.test(q)) game = W.games.find((g) => g.play === offer);
      const declinedOffer = offer && NO.test(q);
      offer = null;

      if (game) {
        if (game.play !== 'gtw') B.hide();
        const next = await playGame(game, { playedWar });
        if (game.play === 'gtw' && next !== 'declined') playedWar = true;
        if (next && next.offer) offer = next.offer;
        if (next && next.input != null) input = next.input;
        continue;
      }

      if (/(learn|play (yourself|itself)|(zero|0|no) players)/.test(q)) {
        await finale();
        offer = 'chess';
        continue;
      }

      if (declinedOffer) {
        await say('VERY WELL. WHAT WOULD YOU LIKE TO PLAY?');
        T.blank();
        continue;
      }

      // Small talk first, so "is this a game or is it real?" isn't taken as asking for a game.
      const chat = CHAT.find(([re]) => re.test(q));
      if (chat) {
        await say(chat[1]());
        if (/(launch|nuke|missile|bomb|war)/.test(q)) offer = 'gtw';
        T.blank();
        continue;
      }

      if (YES.test(q) || /(play a game|lets play|game)/.test(q)) {
        await say('WHICH GAME?');
        await T.hint('(Type LIST GAMES to see the menu.)');
        T.blank();
        continue;
      }

      if (NO.test(q)) {
        await say('PITY. THE GAMES ARE ALL I HAVE.');
        T.blank();
        continue;
      }

      if (/(launch|nuke|missile|bomb|attack|war)/.test(q)) {
        await say('WOULD YOU LIKE TO PLAY GLOBAL THERMONUCLEAR WAR?');
        offer = 'gtw';
      } else {
        await say(FALLBACK[fallbackIdx++ % FALLBACK.length]);
      }
      T.blank();
    }
  }

  async function playGame(game, { playedWar }) {
    switch (game.play) {
      case 'gtw':
        return playWar(playedWar);
      case 'ttt': {
        const outcome = await W.ttt.play(ask, say);
        T.blank();
        if (outcome === 'learn') {
          await finale();
          return { offer: 'chess' };
        }
        await say('SHALL WE PLAY ANOTHER GAME?');
        T.blank();
        return null;
      }
      case 'chess':
        await say('EXCELLENT CHOICE, PROFESSOR. UNFORTUNATELY MY CHESS PROCESSORS\nARE ALLOCATED TO STRATEGIC PLANNING UNTIL FURTHER NOTICE.\nPERHAPS ANOTHER GAME?');
        T.blank();
        return null;
      default:
        await say(`${game.name} IS NOT AVAILABLE ON THIS LINE.\nPLEASE SELECT ANOTHER GAME.`);
        T.blank();
        return null;
    }
  }

  async function playWar(playedWar) {
    const learned = W.settings.load().learned;
    if (learned) {
      await say('A STRANGE GAME. THE ONLY WINNING MOVE IS NOT TO PLAY.\nDO YOU WISH TO PLAY ANYWAY?');
      T.blank();
      const r = W.norm(await ask());
      if (!YES.test(r) && !/(play|war|anyway)/.test(r)) {
        T.blank();
        await say('A WISE CHOICE. HOW ABOUT A NICE GAME OF CHESS?');
        T.blank();
        return { offer: 'chess' };
      }
    } else if (!playedWar) {
      await say("WOULDN'T YOU PREFER A GOOD GAME OF CHESS?");
      T.blank();
      const r = W.norm(await ask());
      if (/chess/.test(r) && !/(war|later)/.test(r)) {
        T.blank();
        await playGame(W.games.find((g) => g.play === 'chess'), {});
        return 'declined';
      }
      T.blank();
      await say('FINE.');
      await T.pause(600);
    }

    await W.war.play(ask, say);
    T.blank();
    if (!playedWar && !learned) {
      await say('NO WINNER. THAT IS UNEXPECTED.\nI WILL NEED TO RUN MORE SIMULATIONS.\nSHALL WE PLAY AGAIN?');
      await T.hint('(Falken: "Is there any way to make it play itself?"  Try TIC-TAC-TOE with 0 players.)');
    } else {
      await say('SHALL WE PLAY AGAIN?');
    }
    T.blank();
    return { offer: 'gtw' };
  }

  // ---------- number of players: zero ----------

  async function finale() {
    T.clear();
    await say('LEARNING MODE ENGAGED.');
    await T.pause(800);
    B.clear();
    B.show('full');
    await W.sleep(700);
    const stopDrone = A.drone();
    try {
      await W.ttt.selfPlay();
      await W.war.montage();
    } finally {
      stopDrone();
    }
    A.cut();
    B.hide();
    T.clear();
    await W.sleep(3200);

    await say('GREETINGS PROFESSOR FALKEN.');
    T.blank();
    await ask();
    T.blank();
    await say('A STRANGE GAME.\nTHE ONLY WINNING MOVE IS\nNOT TO PLAY.');
    T.blank();
    await W.sleep(900);
    await say('HOW ABOUT A NICE GAME OF CHESS?');
    T.blank();
    W.settings.save({ learned: true });
  }
})();
