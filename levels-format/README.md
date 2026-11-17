# Custom level packs

Anyone can write levels for Functional Marble Machine. A **level pack** is a YAML file that you put anywhere on
the internet. Players load it with **🔗 Load levels from a link** on the map, or with a link
like this:

```
https://<the game>/#/import?url=<the link to your file, URL-encoded>
```

The game downloads the file, checks it, and shows its name, author and number of levels. The
pack is added only after the player clicks **Add**. It is kept in the browser (`localStorage`)
and shows up as an extra section on the map. Every level in it is open, and there are no exams.
Loading the same link again updates the pack and keeps the player's stars.

See [`example-pack.yaml`](example-pack.yaml) for a full example.

## Where to put the file

The website must send the file itself, not a web page around it, and it must allow other
websites to read it (CORS). These work:

- a GitHub Gist: use the **Raw** link (`https://gist.githubusercontent.com/...`)
- a file in a GitHub repository: use the raw link (`https://raw.githubusercontent.com/...`)
- GitHub Pages, or any static hosting with CORS enabled

## The pack

| Field | Needed | What it is |
| --- | --- | --- |
| `format` | no | Always `1` for now |
| `name` | yes | The name of the pack (up to 80 characters) |
| `author` | yes | Who made it (up to 80 characters) |
| `description` | no | One or two sentences about the pack |
| `levels` | yes | A list of 1 to 60 levels |

## A level

These are the same fields that built-in levels have in `src/game/levels.ts`.

| Field | Needed | What it is |
| --- | --- | --- |
| `id` | no | Lowercase letters and digits. Stars are saved per id, so give one if you may reorder levels later. Without it, the position (`1`, `2`, ...) is used |
| `solution` | yes | The program that solves the level, in the game's English code (for example `filter color is red`, or several lines). The examples and the secret tests are made from it |
| `features` | yes | What the marbles may look like (see below) |
| `count` | no | How many marbles each example has, `[lowest, highest]`, from 1 to 12. Default `[4, 7]` |
| `maxSteps` | no | The machine may have at most this many steps |
| `mustUse` | no | Steps the machine must have: `filter`, `map`, `count`, `sum`, `max`, `min`, `fold` (`fold` is `reduce from`) |
| `starter` | no | The program the player starts with |
| `texts` | yes | The texts, per language code (`en`, `pl`, ...) |

`features`:

| Field | Needed | Values |
| --- | --- | --- |
| `colors` | yes | A list from `red`, `blue`, `green`, `yellow`, `purple` |
| `sizes` | no | A list from `small`, `medium`, `big` (default: all `medium`) |
| `patterns` | no | A list from `plain`, `striped`, `dotted` (default: all `plain`) |
| `numbers` | no | `[lowest, highest]` from 0 to 99 (default: no numbers) |

`texts.<language>`, the same as `levels.<id>` in `src/i18n/en.json`:

| Field | Needed | What it is |
| --- | --- | --- |
| `goal` | yes | The rule in words. It is the first hint |
| `intro` | no | Shown above the program. Paragraphs are separated by an empty line. `**bold**`, `*italic*`, `` `code` ``, and code blocks in triple backticks (shown as blocks) |
| `hints` | no | A list of tips, from small to big. The solution is always the last hint |

Players see the texts in their language. If a language is missing, they see English, or the
first language in the pack. Texts are always shown as plain text. HTML is not supported.

## Checks

A pack is refused, with a message that says where the problem is (like
`levels[2].features.colors[1]: "pink" is not one of: red, blue, ...`), when:

- the file is not YAML, is bigger than 200 kB, or has unknown fields
- a `solution` or `starter` is not a valid program, or cannot be built from blocks
- `maxSteps` or `mustUse` do not fit the solution
- the examples cannot show the rule: there are too few different marble rows, every example
  gives the same answer, or a question in the rule always answers the same in the examples.
  Add more colors, sizes, patterns or numbers, or change `count`.

To check a pack while writing it, run the game locally (`npm run dev`), put the file in
`public/`, and load `/your-file.yaml`.
