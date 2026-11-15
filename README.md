# Marble Machine

A puzzle game that teaches **filter / map / reduce** to kids (10+). Each level shows a few
examples: marbles going in → what should come out. The player finds the rule and writes a tiny
program for it. Inspired by the programming puzzles of the old Android game *Hacked*.

```bash
npm install
npm run dev      # play at http://localhost:5173
npm test         # language + level tests
npm run build
```

## The language

One step per line. Marbles flow through the lines from top to bottom.

```
filter color is red and size is big      # gate: keep marbles that answer "yes"
map number -> number * 2 if color is red # machine: change marbles (-> means "becomes")
reduce sum number                        # squash everything into one number (always last)
```

- Marble properties: `color` (red blue green yellow purple), `size` (small medium big),
  `pattern` (plain striped dotted), `number`.
- Questions: `is`, `is not`, `= != < > <= >=`, `even`/`odd`, `and`, `or`, `not`, `( )`.
- Math: `+ - * / %` (whole numbers).
- `map a -> x, b -> y [if question]`.
- `reduce count | sum <expr> | max <expr> | min <expr> | from <start> : <expr using total>`.

## Project layout

| Path | What it is |
| --- | --- |
| `src/lang/` | Tokenizer, parser with type checker and kid-friendly errors, and an interpreter that records each stage so the UI can animate it |
| `src/game/levels.ts` | All chapters and levels. **To add a level**, write its reference `solution` and the marble `features`. Examples and secret tests are generated from the solution with a fixed seed |
| `src/game/check.ts` | Runs a player's program on the 3 visible examples and 5 secret tests |
| `src/ui/` | React components: map, level screen, code editor, marble SVGs, animated pipeline |

`npm test` checks every level: the reference solution passes, the starter code doesn't, and
every generated example is "interesting" (each filter keeps some marbles and drops others, each map
changes something, and so on).

Scoring: ⭐ for solving a level, ⭐⭐ for using no more lines than the reference solution.
Progress is saved in `localStorage`.
