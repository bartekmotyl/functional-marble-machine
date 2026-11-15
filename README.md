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

- The rule is hidden: players work it out from the IN/OUT examples. "Tell me the rule" reveals it
  as the first hint. Some levels add constraints, like "use only 1 step" or "you must use reduce from".
- The screen has three columns that fit the window: **Puzzle** (the rule and the IN/OUT examples),
  **Your program** (block editor) and the **Machine** that runs the selected example.
- Programs are built from clickable blocks. "and"/"or" questions live in boxes (an ALL box and a
  ONE-YES box), and boxes can be nested, so there are no hidden priority rules.
- The Machine column has three actions:
  - **▶ Run this**: instant result for the loaded example, with the whole path shown at once. It
    updates live while you edit. Hover or click a marble to see why it was kept, dropped or changed.
  - **🐞 Step by step**: follow the loaded example marble by marble. The block being run lights up
    and every question shows ✓/✗ for the current marble.
  - **✔ Check all**: the answer. Tests every example and the secret tests and shows a ✅/❌ list.
    Click a row to load that example into the machine.
  Run and Step by step are free; only a wrong Check all costs a star.
- Stars: 3 for a level solved without mistakes. Each failed Check all or hint costs a star (minimum 1).
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
| `src/game/check.ts` | Picks 5 visible examples (chosen so every question of the rule shows both yes and no) and 5 secret tests, and runs the player's program on them |
| `src/ui/` | React components: map, level screen, marble SVGs, the animated/step-by-step machine, explanations |

`npm test` checks every level: the reference solution passes, the starter code doesn't, and
every generated example is "interesting" (each filter keeps some marbles and drops others, each map
changes something, and so on).

Levels, saved progress and code samples are stored as code text and turned into blocks when
shown. Progress is saved in `localStorage`.
