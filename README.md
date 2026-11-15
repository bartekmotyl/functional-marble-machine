# Marble Machine

A puzzle game that teaches **filter / map / reduce** to kids (10+). Each level shows a few
examples: marbles going in → what should come out. The player finds the rule and builds a tiny
program for it by clicking blocks (no typing). Inspired by the programming puzzles of the old
Android game *Hacked*.

```bash
npm install
npm run dev      # play at http://localhost:5173
npm test         # language + level tests
npm run build
```

## Playing

- Programs are built from clickable blocks. "and"/"or" questions live in boxes (an ALL box and a
  ONE-YES box), and boxes can be nested, so there are no hidden priority rules.
- **▶ Run** tests the machine on all examples plus 5 secret tests.
- **🐞 Step by step** follows one example marble by marble. The block being run lights up, and
  every question shows ✓/✗ for the current marble. It's free. Hovering or clicking a marble
  after a run explains why it was kept, dropped or changed.
- Stars: 3 for a level solved without mistakes. Each failed run or hint costs a star (minimum 1).
- Cheat mode (on the map screen) opens all levels.

## The language

Blocks are shown as code with the **</> Code** button. One step per line, top to bottom.

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
| `src/lang/` | Tokenizer, parser with type checker, and an interpreter that records each stage and the value of every question, for animations and explanations |
| `src/blocks/` | The block program model (blocks ⇄ code text ⇄ runnable AST) and the clickable block editor |
| `src/game/levels.ts` | All chapters and levels. **To add a level**, write its reference `solution` and the marble `features`. Examples and secret tests are generated from the solution with a fixed seed |
| `src/game/check.ts` | Runs a player's program on the 3 visible examples and 5 secret tests |
| `src/ui/` | React components: map, level screen, marble SVGs, the animated/step-by-step machine, explanations |

`npm test` checks every level: the reference solution passes, the starter code doesn't, and
every generated example is "interesting" (each filter keeps some marbles and drops others, each map
changes something, and so on).

Levels, saved progress and code samples are stored as code text and turned into blocks when
shown. Progress is saved in `localStorage`.
