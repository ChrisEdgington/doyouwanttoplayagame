// Tic-tac-toe: a perfect (and therefore unbeatable) opponent, plus the zero-player self-play
// where WOPR finally learns something.
(function () {
  const W = window.WOPR;
  const T = W.term;
  const A = W.audio;
  const B = W.board;

  const ttt = (W.ttt = {});

  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  function result(cells) {
    for (const [a, b, c] of LINES) {
      if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return cells[a];
    }
    return cells.every(Boolean) ? 'DRAW' : null;
  }

  const memo = new Map();
  // Score from X's point of view: +10 X wins, -10 O wins, 0 draw. Faster wins score higher.
  function minimax(cells, turn, depth = 0) {
    const key = cells.map((c) => c || '.').join('') + turn;
    if (memo.has(key)) return memo.get(key);
    const r = result(cells);
    let score;
    if (r === 'X') score = 10 - depth;
    else if (r === 'O') score = depth - 10;
    else if (r === 'DRAW') score = 0;
    else {
      score = turn === 'X' ? -Infinity : Infinity;
      for (let i = 0; i < 9; i++) {
        if (cells[i]) continue;
        cells[i] = turn;
        const s = minimax(cells, turn === 'X' ? 'O' : 'X', depth + 1);
        cells[i] = null;
        score = turn === 'X' ? Math.max(score, s) : Math.min(score, s);
      }
    }
    memo.set(key, score);
    return score;
  }

  // A random choice among the optimal moves, so WOPR doesn't play the same game every time.
  function bestMove(cells, turn) {
    let best = turn === 'X' ? -Infinity : Infinity;
    let moves = [];
    for (let i = 0; i < 9; i++) {
      if (cells[i]) continue;
      cells[i] = turn;
      const s = minimax(cells, turn === 'X' ? 'O' : 'X', 1);
      cells[i] = null;
      if (s === best) moves.push(i);
      else if (turn === 'X' ? s > best : s < best) (best = s), (moves = [i]);
    }
    return W.pick(moves);
  }

  function boardText(cells) {
    const c = (i) => cells[i] || String(i + 1);
    const row = (r) => `        ${c(r)} | ${c(r + 1)} | ${c(r + 2)}`;
    return [row(0), '       ---+---+---', row(3), '       ---+---+---', row(6)].join('\n');
  }

  // ---------- human vs WOPR, in the terminal ----------

  ttt.play = async function (ask, say) {
    B.hide();
    T.clear();
    await T.print('TIC-TAC-TOE\n');
    for (;;) {
      const q = W.norm(await ask('NUMBER OF PLAYERS:  '));
      if (/^(0|zero|none|no one|nobody)$/.test(q)) return 'learn';
      if (/^(1|one)$/.test(q)) break;
      if (/^(2|two)$/.test(q)) {
        await T.print('THERE IS ONLY ONE TERMINAL ON THIS LINE. ONE PLAYER, THEN.');
        break;
      }
      await T.print('PLEASE ENTER 0, 1 OR 2.');
    }

    let games = 0;
    let draws = 0;
    let humanFirst = true;
    for (;;) {
      const cells = Array(9).fill(null);
      const human = humanFirst ? 'X' : 'O';
      const wopr = humanFirst ? 'O' : 'X';
      let turn = 'X';
      await T.print(`\nYOU ARE ${human}.  ${humanFirst ? 'YOU MOVE FIRST.' : 'I WILL MOVE FIRST.'}\n`);
      if (humanFirst) await T.print(boardText(cells), { cps: 300 });

      while (!result(cells)) {
        if (turn === human) {
          const q = W.norm(await ask('YOUR MOVE (1-9):  '));
          if (/^(q|quit|stop|exit|end|no)$/.test(q)) return 'quit';
          const n = parseInt(q, 10);
          if (!(n >= 1 && n <= 9)) {
            await T.print('ENTER A SQUARE NUMBER FROM 1 TO 9.');
            continue;
          }
          if (cells[n - 1]) {
            await T.print('THAT SQUARE IS TAKEN.');
            continue;
          }
          cells[n - 1] = human;
        } else {
          await T.pause(450);
          const m = bestMove(cells, wopr);
          cells[m] = wopr;
          await T.print(`\nI TAKE ${m + 1}.\n`);
          await T.print(boardText(cells), { cps: 300 });
        }
        turn = turn === 'X' ? 'O' : 'X';
      }

      // The human made the last move, so the final board hasn't been shown yet.
      if (turn === wopr) await T.print('\n' + boardText(cells), { cps: 300 });
      games++;
      const r = result(cells);
      T.blank();
      if (r === 'DRAW') {
        draws++;
        A.beep(440, 0.15);
        await T.print('DRAW.');
      } else if (r === wopr) {
        A.beep(880, 0.2);
        await T.print('I WIN.');
      } else {
        await T.print('YOU WIN.  THIS SHOULD NOT BE POSSIBLE.');
      }
      if (draws === 2) {
        await say('FASCINATING. WHEN BOTH PLAYERS ARE COMPETENT, THIS GAME HAS NO WINNER.');
      }
      if (draws === 3) {
        await T.hint('(Falken: "Is there any way to make it play itself?"  Try NUMBER OF PLAYERS: 0)');
      }
      humanFirst = !humanFirst;
      const again = W.norm(await ask('\nANOTHER GAME?  '));
      if (/^(0|zero)$/.test(again)) return 'learn';
      if (!/^(y|yes|sure|ok|okay|yeah|yep|again|another|1)/.test(again)) return 'quit';
    }
  };

  // ---------- zero players: WOPR plays itself on the big board ----------

  ttt.selfPlay = async function () {
    const stages = [
      { n: 1, cols: 1, step: 380, hold: 1200 },
      { n: 4, cols: 2, step: 150, hold: 700 },
      { n: 9, cols: 3, step: 70, hold: 450 },
      { n: 24, cols: 6, step: 34, hold: 300 },
      { n: 60, cols: 10, step: 16, hold: 220 },
      { n: 160, cols: 16, step: 8, hold: 260 },
    ];
    let total = 0;
    for (const { n, cols, step, hold } of stages) {
      const games = Array.from({ length: n }, () => ({ cells: Array(9).fill(null), turn: 'X', wait: W.randInt(0, 4), done: false }));
      B.showTTT({ games, cols });
      B.hud({ title: 'TIC-TAC-TOE', clock: 'PLAYERS: 0', b: `GAMES: ${total}` });
      while (games.some((g) => !g.done)) {
        for (const g of games) {
          if (g.done) continue;
          if (g.wait > 0) {
            g.wait--;
            continue;
          }
          g.cells[bestMove(g.cells, g.turn)] = g.turn;
          g.turn = g.turn === 'X' ? 'O' : 'X';
          if (result(g.cells)) {
            g.done = true;
            g.label = result(g.cells) === 'DRAW' ? 'DRAW' : `${result(g.cells)} WINS`;
            total++;
            B.setHud('b', `GAMES: ${total}`);
          }
        }
        if (n < 10) A.beep(n === 1 ? 660 : 990, 0.03);
        else A.tick();
        await W.sleep(step);
      }
      await W.sleep(hold);
    }
  };
})();
