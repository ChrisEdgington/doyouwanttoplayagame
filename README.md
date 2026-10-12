# W.O.P.R.

A throwback to *WarGames* (1983): war-dial Sunnyvale, find the backdoor, and play a few games with Joshua.

## Run it

Open `index.html` in a browser. It works from `file://` with no build step and no network; everything is vendored.

You can also serve it (`uv run python -m http.server 8765`) and visit `http://127.0.0.1:8765`. Add `?skip` to the URL to skip the war-dialer intro.

Turn your sound on. Joshua's voice copies how the film made it: an English voice ("Daniel" on macOS) says each word on its own, and the game joins the words back to back with an electronic filter. The recordings ship in `vendor/joshua-voice.js`, so every device hears the same voice.

If you add or change anything Joshua says, re-record on a Mac with ffmpeg installed:

```
node tools/build-voice.mjs          # record any new words
node tools/build-voice.mjs --check  # list words that aren't recorded yet
```

A word that isn't recorded makes that line fall back to the browser's built-in voice, and the browser console names the missing word.

## How to play

If you remember the movie, play it the way David did. If you don't:

- At `LOGON:`, try `help games` and `list games`. The backdoor password is the name of Falken's son.
- Talk to Joshua in plain English. Ask him for **Global Thermonuclear War**, pick a side, and list your targets by city name (`list` shows the target database).
- Try **tic-tac-toe**. When it asks for the number of players, you know what to do.

Commands that work at any prompt: `list games`, `help`, `color green|amber|blue|white`, `voice on|off`, `sound on|off`, `mute`, `clear`, `logoff`. Pressing RETURN while text is printing skips ahead.

## Layout

| File | What it does |
| --- | --- |
| `js/main.js` | Power-on, the war-dialer, and the LOGON loop |
| `js/joshua.js` | LOGON screen, conversation, game routing, the finale |
| `js/war.js` | Global Thermonuclear War and the scenario montage |
| `js/tictactoe.js` | Minimax tic-tac-toe and zero-player self-play |
| `js/board.js` | The big board: canvas world map, missile arcs, blasts, HUD |
| `js/terminal.js` | Teletype output and line input |
| `js/audio.js` | Synthesized modem, klaxon, launches, blasts; plays Joshua's recorded words |
| `tools/build-voice.mjs` | Records Joshua's vocabulary into `vendor/joshua-voice.js` |
| `js/data.js` | Cities, launch sites, factions, scenarios, the games menu |
| `css/crt.css` | Phosphor glow, scanlines, flicker, color themes |
| `vendor/` | d3 7.9.0, topojson-client 3.1.0, world-atlas 2.0.2 (110m), and the VT323 font |
