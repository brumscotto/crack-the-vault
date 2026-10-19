# Crack the Vault

A heist game for solving 1-, 2- and 3-variable equations, built on Aaron Bergmann's
[AlgebraNotebook](https://aaronbbergmann.github.io/AlgebraNotebook/).

Every lock is a system of equations. Students solve for each variable to set the vault's dials.

- **Ground floor, Lockbox Lobby:** one variable (`3x − 2 = 19`)
- **Basement, The Twin Safes:** 2 × 2 systems, solved by elimination and substitution
- **Sub-basement, The Deep Vault:** 3 × 3 systems

Each floor has 8 boxes and a boss vault. Some locks are rigged: students have to recognize
**no solution** ("Jammed") or **infinitely many solutions** ("Any code").

## Moves

| Gesture | Algebra |
| --- | --- |
| Drag a row onto another row | Add the equations |
| × button on a row | Multiply every term by a number |
| Drag a number across the = sign | Add or subtract it on both sides |
| Drag the coefficient across the = sign | Divide both sides |
| Drag a cracked dial's tag onto a letter | Substitute |

## By hand

Beating a floor's boss opens **By hand** mode for that floor (switch it on the floor map).
After every move, the numbers that changed turn into boxes with the arithmetic shown above
them (`26 + 4`, `5 × (−3)`, `3(−1)`), and the student types each result. Wrong answers can be
retried. Tip fills in a box, and Undo takes back the move. By hand has its own stars and pays
1.5× the loot.

## Scoring

- **Cracked:** opened the lock, or made the right call on a rigged one
- **Clean job:** finished at or under par. Par is the move count of the built-in solver's path.
- **No tips:** never asked the Inside Man for a tip

Progress is saved in the browser's `localStorage`. Teachers can unlock every floor in Settings.

## Run it

It's a static site with no build step. Serve the folder with any web server:

```bash
python3 -m http.server 8765
```

To deploy, push the folder to a GitHub repo and turn on GitHub Pages.

## Files

- `js/engine.js`: fractions, the moves, problem generators, and the solver that sets par and writes tips
- `js/art.js`: all graphics, drawn as SVG
- `js/audio.js`: sound effects, synthesized with Web Audio
- `js/game.js`: the map, workbench, drag and drop, scoring and saved progress
- `css/style.css`: styles
