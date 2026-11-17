# Functional Marble Machine

A puzzle game that teaches **filter / map / reduce** to kids (10+). Each level shows a few
examples: marbles going in → what should come out. The player finds the rule and builds a tiny
program for it by clicking blocks (no typing). Inspired by the programming puzzles of the old
Android game *Hacked*. Available in English and Polish.

```bash
npm install
npm run dev               # play at http://localhost:5173
npm test                  # language, level, progression and translation tests
npm run i18n -- check     # report missing translations
npm run build
```

## Playing

- **Sections**: 7 sections with 24-25 practice levels each, getting slowly harder, plus
  🌋 *The Volcano*: 20 really hard puzzles for grown-ups (199 levels in total). After 5 solved practice levels the section's 🎓 **exam** (its hardest puzzle) opens. Passing the
  exam opens the next section. Each section has its own page, shown when you enter it.
- The rule is hidden: players work it out from 5 IN/OUT examples, picked so that every part of
  the rule shows up. "Tell me the rule" reveals it as the first hint; the last hint shows a
  solution. Some levels add constraints, like "use only 1 step" or "you must use reduce from".
- The screen has three columns that fit the window: **Puzzle** (the rule and the examples),
  **Your program** (block editor) and the **Machine** that runs the selected example.
- Programs are built from clickable blocks. "and"/"or" questions live in boxes (an ALL box and a
  ONE-YES box). Click a box title to switch it between and/or. A box can hold one more box
  inside, but no deeper. A filter can be switched from "keep" to "throw away" marbles.
- Machine actions:
  - **▶ Run**: instant result for the loaded example (also under the program; the machine
    lights up). Updates live while you edit. Hover or click a marble to see why.
  - **🐞 Step by step**: follow the loaded example marble by marble; the view follows along.
  - **✔ Check all**: the answer. Tests every example and the secret tests and shows a ✅/❌ list.
- **Stars**: up to 5 per level. Run and Step by step are free; a wrong Check all or a hint costs
  a star. Telling the rule costs two - or one if you opened the 🧪 **marble lab** first (it
  costs one star once). In the lab you build any row of marbles, see what the rule makes of it
  and can put it in the machine. So experimenting first never costs more, and pays off when
  you find the rule yourself.
- Cheat mode (on the map screen) opens all levels.
- **Skins** (🎨 on the map screen) change the look: *Candy* (default) and *Pastel* (calm
  colors, flat buttons). Each works with the light and dark theme, which follows the system
  until the player picks one.

## Skins

A skin is a YAML file in `skins/`: colors (one value, or `{ light, dark }`), marble shades,
the font, roundness, button depth and section icons. `skins/candy.yaml` explains every entry.
At build time `build/skins.ts` checks each skin and turns it into CSS variables
(`import skins from 'virtual:skins'`); a broken skin stops the build with a clear message.
All colors in the CSS are skin colors or `color-mix()` of them, so a new skin and the dark
theme need no CSS changes. Skins change only the look: a red marble stays red.

## Custom levels

Players can load their own levels: a YAML **level pack** hosted anywhere (a Gist raw link, for
example). On the map, use **🔗 Load levels from a link**, or open
`#/import?url=<URL-encoded link>`. The game downloads the file, checks it
(`src/game/packs.ts`), shows the name, author and number of levels, and adds the pack only after
the player confirms. Packs are kept in `localStorage` (`marble-machine-packs-v1`) and appear as
extra sections on the map, with every level open. Their level ids get a prefix made from the
link, so stars never clash with built-in levels. Removing a pack also removes its stars.

The format, with every field and check, is in [`levels-format/README.md`](levels-format/README.md),
and there is an example in `levels-format/example-pack.yaml`. A copy is served at
`/example-pack.yaml` by the dev server, so `#/import?url=%2Fexample-pack.yaml` loads it locally.
Pack texts come from the internet, so they are only ever shown as text, never as HTML.

## Translations

Every visible text lives in `src/i18n/<lang>.json` (`en.json` is the reference): the interface,
the words used in blocks (`words`, `kw`), section names, Spellbook pages and the rule, intro and
hints of every level (`levels.<id>`). Polish texts address the player gender-neutrally
("Ukończyłeś/aś"); a test guards this. Plural forms use `.one / .few / .many / .other` keys,
chosen by the language's own plural rules.

To add a language:

```bash
npm run i18n -- new de      # creates src/i18n/de.json with the English texts
```

Translate the texts, set `meta.name`, optionally add a `code` section (how the code view is shown,
see `pl.json`), then run `npm run i18n -- check`. The game picks up new files automatically, and
`npm test` fails if a language misses a text or a `{placeholder}`.

## The language

The blocks are a front end for a small text language (the **</> Code** button shows it, with the
keywords in the player's language). One step per line, top to bottom.

```
filter color is red and size is big      # gate: keep marbles that answer "yes"
filter not (color is red)                # gate that throws away marbles that answer "yes"
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
| `src/lang/` | Tokenizer, parser with type checker, and an interpreter that records each stage and the value of every question, for explanations |
| `src/blocks/` | The block program model (blocks ⇄ code text ⇄ runnable AST) and the clickable block editor |
| `src/game/levels.ts` | All sections and levels, as data. **To add a level**, write its reference `solution` and the marble `features`, then add its texts to the language files. Examples and secret tests are generated from the solution with a fixed seed |
| `src/game/progression.ts` | Which levels, exams and sections are open |
| `src/game/check.ts` | Picks 5 visible examples (so every question of the rule shows both yes and no) and 5 secret tests, and runs the player's program on them |
| `src/i18n/` | Translation files and the tiny `t()` helper |
| `skins/`, `build/skins.ts` | Skins and the build step that turns them into CSS |
| `src/game/packs.ts`, `src/game/packStore.ts`, `levels-format/` | Custom level packs: the format, its checks, and storage in the browser |
| `src/ui/` | React components: map, section page, level screen, marble SVGs, the machine, explanations |

`npm test` checks every level: the reference solution passes, the starter code doesn't, every
generated example is "interesting" (each filter keeps some marbles and drops others, each map
changes something...), and every question of the rule answers both yes and no in the examples.

Levels, saved progress and code samples are stored as code text and turned into blocks when
shown. Progress is saved in `localStorage`.
