import type { StepKind } from '../lang/parser'
import type { Features } from './generate'

/** Language features a level teaches. Used to build the "Spellbook" (reference) and word chips. */
export type Concept =
  | 'filter'
  | 'isnot'
  | 'size'
  | 'pattern'
  | 'chain'
  | 'and'
  | 'or'
  | 'brackets'
  | 'compare'
  | 'evenodd'
  | 'map'
  | 'mapmany'
  | 'mapif'
  | 'math'
  | 'count'
  | 'sum'
  | 'maxmin'
  | 'fold'

export interface Level {
  id: string
  title: string
  /** One-sentence task shown in big letters. */
  goal: string
  /** Explanation of anything new. Paragraphs separated by blank lines, `code` and ``` blocks allowed. */
  intro?: string
  solution: string
  features: Features
  count?: [number, number]
  hints: string[]
  unlocks?: Concept[]
  mustUse?: StepKind[]
  starter?: string
}

export interface Chapter {
  id: string
  title: string
  emoji: string
  blurb: string
  levels: Level[]
}

const RB: Features = { colors: ['red', 'blue'] }
const RBG: Features = { colors: ['red', 'blue', 'green'] }
const FOUR: Features = { colors: ['red', 'blue', 'green', 'yellow'] }
const ALL5: Features = { colors: ['red', 'blue', 'green', 'yellow', 'purple'] }

export const CHAPTERS: Chapter[] = [
  {
    id: 'filter',
    title: 'The Sorting Room',
    emoji: '🔍',
    blurb: 'Learn to pick out exactly the marbles you want with filter.',
    levels: [
      {
        id: 'f1',
        title: 'Only Red',
        goal: 'Keep only the red marbles.',
        intro: `Welcome to the Marble Machine! Marbles roll in on the left. Your program decides what comes out on the right.

Look at the examples: on the left is what goes in, on the right is what should come out. Can you spot the pattern?

**filter** is a gate. It asks every marble a question. Marbles that answer *yes* roll on, the others drop out. This program keeps blue marbles:

\`\`\`
filter color is blue
\`\`\`

Now change it so it keeps the red ones, then press **Run**.`,
        starter: 'filter color is blue',
        solution: 'filter color is red',
        features: RB,
        count: [4, 6],
        hints: ['You only need to change one word.', 'Change "blue" into "red".'],
        unlocks: ['filter'],
      },
      {
        id: 'f2',
        title: 'Green Team',
        goal: 'Keep only the green marbles.',
        intro: `Now there are three colors. Write the whole line yourself this time!

Tip: you can click the word chips under the editor to insert them.`,
        solution: 'filter color is green',
        features: RBG,
        hints: ['Start with the word filter.', 'filter color is green'],
      },
      {
        id: 'f3',
        title: 'No Yellow Allowed',
        goal: 'Remove all yellow marbles. Keep everything else.',
        intro: `Sometimes it is easier to say what you **don't** want. Add **not** after **is**:

\`\`\`
filter color is not red
\`\`\`

This keeps every marble that is not red.`,
        solution: 'filter color is not yellow',
        features: FOUR,
        hints: ['Use "is not".', 'filter color is not yellow'],
        unlocks: ['isnot'],
      },
      {
        id: 'f4',
        title: 'Big Ones',
        goal: 'Keep only the big marbles.',
        intro: `Marbles also come in three sizes: **small**, **medium** and **big**.

You can ask about size just like you ask about color:

\`\`\`
filter size is small
\`\`\``,
        solution: 'filter size is big',
        features: { colors: RBG.colors, sizes: ['small', 'medium', 'big'] },
        hints: ['This time the question is about size, not color.', 'filter size is big'],
        unlocks: ['size'],
      },
      {
        id: 'f5',
        title: 'Stripes!',
        goal: 'Keep only the striped marbles.',
        intro: `Some marbles have a pattern: **plain**, **striped** or **dotted**.

\`\`\`
filter pattern is dotted
\`\`\``,
        solution: 'filter pattern is striped',
        features: { colors: RBG.colors, patterns: ['plain', 'striped', 'dotted'] },
        hints: ['Ask about the pattern.', 'filter pattern is striped'],
        unlocks: ['pattern'],
      },
      {
        id: 'f6',
        title: 'Two Gates',
        goal: 'Keep only the marbles that are red AND big.',
        intro: `A program can have many lines. Marbles go through them from top to bottom, like a conveyor belt with several gates.

\`\`\`
filter color is blue
filter size is small
\`\`\`

The first gate lets only blue marbles through. The second gate checks those blue marbles and keeps the small ones.`,
        solution: 'filter color is red\nfilter size is big',
        features: { colors: RBG.colors, sizes: ['small', 'medium', 'big'] },
        count: [5, 8],
        hints: ['Use two lines: one for color, one for size.', 'filter color is red\nfilter size is big'],
        unlocks: ['chain'],
      },
      {
        id: 'f7',
        title: 'Small, But Not Blue',
        goal: 'Keep the small marbles that are not blue.',
        solution: 'filter size is small\nfilter color is not blue',
        features: { colors: RBG.colors, sizes: ['small', 'medium', 'big'] },
        count: [5, 8],
        hints: ['Two gates again.', 'One gate for "small", one for "is not blue".'],
      },
      {
        id: 'f8',
        title: 'One Gate, Two Questions',
        goal: 'Keep the marbles that are green AND striped - using only one line.',
        intro: `You can ask two questions in one gate with **and**. A marble passes only if both answers are *yes*:

\`\`\`
filter color is red and size is big
\`\`\`

⭐ Bonus star: solve levels with as few lines as possible.`,
        solution: 'filter color is green and pattern is striped',
        features: { colors: RBG.colors, patterns: ['plain', 'striped', 'dotted'] },
        count: [5, 8],
        hints: ['Put "and" between two questions.', 'filter color is green and pattern is striped'],
        unlocks: ['and'],
      },
      {
        id: 'f9',
        title: 'Either One',
        goal: 'Keep the marbles that are red OR yellow.',
        intro: `With **or**, a marble passes if at least one answer is *yes*:

\`\`\`
filter color is blue or color is green
\`\`\`

Careful: two separate gates can't do this! The first gate would already throw away all the yellow marbles.`,
        solution: 'filter color is red or color is yellow',
        features: FOUR,
        count: [5, 8],
        hints: ['Use "or" between two questions.', 'Each side needs the full question: color is red or color is yellow'],
        unlocks: ['or'],
      },
      {
        id: 'f10',
        title: 'Puzzle Box',
        goal: 'Keep the marbles that are big or dotted, but never purple ones.',
        intro: `When you mix **and** with **or**, use brackets to say what belongs together - just like in math:

\`\`\`
filter (color is red or color is blue) and size is small
\`\`\`

Or use two gates - that works too!`,
        solution: 'filter size is big or pattern is dotted\nfilter color is not purple',
        features: { colors: ['red', 'blue', 'purple'], sizes: ['small', 'big'], patterns: ['plain', 'dotted'] },
        count: [6, 9],
        hints: [
          'Split it: first keep "big or dotted", then remove purple.',
          'filter size is big or pattern is dotted\nfilter color is not purple',
        ],
        unlocks: ['brackets'],
      },
    ],
  },
  {
    id: 'numbers',
    title: 'Number Valley',
    emoji: '🔢',
    blurb: 'Marbles with numbers! Compare them with > and <.',
    levels: [
      {
        id: 'n1',
        title: 'More Than Five',
        goal: 'Keep the marbles with a number bigger than 5.',
        intro: `These marbles have numbers on them! You can compare numbers:

\`\`\`
filter number > 3     # bigger than 3
filter number < 3     # smaller than 3
filter number is 3    # exactly 3
\`\`\`

(Anything after # is a comment - the machine ignores it.)`,
        solution: 'filter number > 5',
        features: { colors: ['blue'], numbers: [1, 9] },
        hints: ['Use the > sign.', 'filter number > 5'],
        unlocks: ['compare'],
      },
      {
        id: 'n2',
        title: 'Three or Less',
        goal: 'Keep the marbles with numbers 3 or smaller.',
        intro: `**<=** means "smaller or equal" and **>=** means "bigger or equal".

\`\`\`
filter number >= 4    # 4, 5, 6, ...
\`\`\``,
        solution: 'filter number <= 3',
        features: { colors: ['green'], numbers: [1, 9] },
        hints: ['"3 or smaller" includes 3 itself.', 'filter number <= 3 (or: filter number < 4)'],
      },
      {
        id: 'n3',
        title: 'Even Steven',
        goal: 'Keep the marbles with even numbers.',
        intro: `Even numbers are 2, 4, 6, 8 ... and odd numbers are 1, 3, 5, 7 ...

\`\`\`
filter number is odd
\`\`\``,
        solution: 'filter number is even',
        features: { colors: ['yellow'], numbers: [1, 9] },
        hints: ['filter number is even'],
        unlocks: ['evenodd'],
      },
      {
        id: 'n4',
        title: 'Odd Reds',
        goal: 'Keep the red marbles that have odd numbers.',
        solution: 'filter color is red and number is odd',
        features: { colors: RB.colors, numbers: [1, 9] },
        count: [5, 8],
        hints: ['Two questions: one about color, one about the number.', 'filter color is red and number is odd'],
      },
      {
        id: 'n5',
        title: 'In the Middle',
        goal: 'Keep the marbles with numbers between 3 and 7 (including 3 and 7).',
        solution: 'filter number >= 3 and number <= 7',
        features: { colors: ['purple'], numbers: [1, 10] },
        count: [5, 8],
        hints: ['A number is "between" when it is big enough AND small enough.', 'filter number >= 3 and number <= 7'],
      },
      {
        id: 'n6',
        title: 'Size Order',
        goal: 'Keep the marbles that are bigger than small.',
        intro: `Sizes can be compared too: small < medium < big.`,
        solution: 'filter size > small',
        features: { colors: RBG.colors, sizes: ['small', 'medium', 'big'] },
        hints: ['You could use "is not small" - or try the > sign with sizes!', 'filter size > small'],
      },
    ],
  },
  {
    id: 'map',
    title: 'The Paint Shop',
    emoji: '🎨',
    blurb: 'Change marbles with map: paint, grow and decorate them.',
    levels: [
      {
        id: 'm1',
        title: 'Everything Blue',
        goal: 'Paint every marble blue.',
        intro: `**map** is a machine that changes *every* marble that goes through it. The arrow **->** means "becomes":

\`\`\`
map color -> green
\`\`\`

Every marble's color becomes green. Nothing gets thrown away - map never removes marbles.`,
        solution: 'map color -> blue',
        features: { colors: ['red', 'green', 'yellow'], sizes: ['small', 'big'] },
        hints: ['map color -> blue'],
        unlocks: ['map'],
      },
      {
        id: 'm2',
        title: 'Grow!',
        goal: 'Make every marble big.',
        solution: 'map size -> big',
        features: { colors: RBG.colors, sizes: ['small', 'medium'] },
        hints: ['This time change the size.', 'map size -> big'],
      },
      {
        id: 'm3',
        title: 'Makeover',
        goal: 'Make every marble purple AND dotted.',
        intro: `One map can change several things. Separate them with a comma:

\`\`\`
map color -> red, size -> small
\`\`\``,
        solution: 'map color -> purple, pattern -> dotted',
        features: { colors: RBG.colors, patterns: ['plain', 'striped'] },
        hints: ['Use a comma between the two changes.', 'map color -> purple, pattern -> dotted'],
        unlocks: ['mapmany'],
      },
      {
        id: 'm4',
        title: 'Pick and Paint',
        goal: 'Keep only the red marbles and paint them yellow.',
        intro: `Now combine the gate and the machine! First **filter**, then **map**.`,
        solution: 'filter color is red\nmap color -> yellow',
        features: RBG,
        count: [5, 8],
        hints: ['Two lines: filter first, then map.', 'filter color is red\nmap color -> yellow'],
      },
      {
        id: 'm5',
        title: 'Stripe the Small Ones',
        goal: 'Keep the small marbles and give them stripes.',
        solution: 'filter size is small\nmap pattern -> striped',
        features: { colors: RB.colors, sizes: ['small', 'big'] },
        count: [5, 8],
        hints: ['filter first, then map.', 'filter size is small\nmap pattern -> striped'],
      },
      {
        id: 'm6',
        title: 'Only Some',
        goal: 'Paint the big marbles red. Leave the others as they are.',
        intro: `Add **if** at the end of a map to change only some marbles. The others pass through unchanged - nobody is thrown away!

\`\`\`
map color -> green if pattern is dotted
\`\`\``,
        solution: 'map color -> red if size is big',
        features: { colors: ['blue', 'green', 'yellow'], sizes: ['small', 'big'] },
        count: [5, 7],
        hints: ['Use map ... if ...', 'map color -> red if size is big'],
        unlocks: ['mapif'],
      },
      {
        id: 'm7',
        title: 'Swap Shop',
        goal: 'Turn red marbles blue and blue marbles red.',
        intro: `Careful - order matters! If you first paint red marbles blue, then you can't tell them apart from the blue ones anymore...

Hint: you can use a third color as a temporary "parking spot".`,
        solution: 'map color -> green if color is red\nmap color -> red if color is blue\nmap color -> blue if color is green',
        features: RB,
        count: [5, 7],
        hints: [
          'Three maps: red -> green, then blue -> red, then green -> blue.',
          'map color -> green if color is red\nmap color -> red if color is blue\nmap color -> blue if color is green',
        ],
      },
      {
        id: 'm8',
        title: 'Grow Then Choose',
        goal: 'Every green marble becomes big. Then keep only the big marbles.',
        solution: 'map size -> big if color is green\nfilter size is big',
        features: { colors: RBG.colors, sizes: ['small', 'big'] },
        count: [6, 8],
        hints: ['First map (with if), then filter.', 'map size -> big if color is green\nfilter size is big'],
      },
    ],
  },
  {
    id: 'math',
    title: 'The Number Factory',
    emoji: '⚙️',
    blurb: 'Do math on the numbers inside the marbles.',
    levels: [
      {
        id: 'x1',
        title: 'Double Trouble',
        goal: 'Double the number on every marble.',
        intro: `map can change numbers with math. On the right side of the arrow, **number** means "the number this marble had before":

\`\`\`
map number -> number + 1
\`\`\`

A marble with 4 becomes 5, a marble with 7 becomes 8.

You can use \`+\` \`-\` \`*\` (times) and \`/\` (divide).`,
        solution: 'map number -> number * 2',
        features: { colors: ['blue'], numbers: [1, 9] },
        hints: ['Look at the examples: 2 becomes 4, 3 becomes 6...', 'map number -> number * 2'],
        unlocks: ['math'],
      },
      {
        id: 'x2',
        title: 'Plus Three',
        goal: 'Find the pattern!',
        solution: 'map number -> number + 3',
        features: { colors: ['green'], numbers: [0, 9] },
        hints: ['Compare each marble going in with the one coming out.', 'Each number grows by 3.'],
      },
      {
        id: 'x3',
        title: 'Countdown',
        goal: 'Find the pattern!',
        solution: 'map number -> 10 - number',
        features: { colors: ['red'], numbers: [0, 10] },
        hints: ['1 becomes 9, 2 becomes 8, 3 becomes 7... What do the two numbers add up to?', 'map number -> 10 - number'],
      },
      {
        id: 'x4',
        title: 'Two Steps',
        goal: 'Find the pattern!',
        solution: 'map number -> number * 2 + 1',
        features: { colors: ['purple'], numbers: [0, 9] },
        hints: ['There are two math steps: times something, then plus something.', 'map number -> number * 2 + 1'],
      },
      {
        id: 'x5',
        title: 'Squares',
        goal: 'Find the pattern!',
        solution: 'map number -> number * number',
        features: { colors: ['yellow'], numbers: [1, 9] },
        hints: ['3 becomes 9, 4 becomes 16... Multiply the number by itself!', 'map number -> number * number'],
      },
      {
        id: 'x6',
        title: 'Half of Even',
        goal: 'Keep the even marbles and cut their numbers in half.',
        solution: 'filter number is even\nmap number -> number / 2',
        features: { colors: ['blue'], numbers: [1, 12] },
        count: [5, 8],
        hints: ['filter first, then map with /', 'filter number is even\nmap number -> number / 2'],
      },
      {
        id: 'x7',
        title: 'Red Bonus',
        goal: 'Red marbles get 10 extra points. The others stay the same.',
        solution: 'map number -> number + 10 if color is red',
        features: { colors: RB.colors, numbers: [1, 9] },
        count: [5, 8],
        hints: ['Use map ... if ...', 'map number -> number + 10 if color is red'],
      },
      {
        id: 'x8',
        title: 'Factory Line',
        goal: 'Find the pattern! (Look closely at the colors too.)',
        solution: 'filter color is not green\nmap number -> number * 3',
        features: { colors: RBG.colors, numbers: [1, 9] },
        count: [5, 8],
        hints: ['Some marbles disappear. Which ones?', 'filter color is not green\nmap number -> number * 3'],
      },
    ],
  },
  {
    id: 'reduce',
    title: 'The Counting Tower',
    emoji: '🧮',
    blurb: 'Squash a whole stream of marbles into one number with reduce.',
    levels: [
      {
        id: 'r1',
        title: 'How Many?',
        goal: 'Count the marbles.',
        intro: `**reduce** squashes all the marbles into **one number**. The simplest one counts them:

\`\`\`
reduce count
\`\`\`

After reduce there are no more marbles - just a number. So reduce is always the last line.`,
        solution: 'reduce count',
        features: ALL5,
        count: [2, 9],
        hints: ['reduce count'],
        unlocks: ['count'],
      },
      {
        id: 'r2',
        title: 'How Many Reds?',
        goal: 'Count only the red marbles.',
        solution: 'filter color is red\nreduce count',
        features: RBG,
        count: [5, 9],
        hints: ['First keep the red ones, then count.', 'filter color is red\nreduce count'],
      },
      {
        id: 'r3',
        title: 'Add It Up',
        goal: 'Add up all the numbers.',
        intro: `**reduce sum** adds up something for every marble:

\`\`\`
reduce sum number
\`\`\``,
        solution: 'reduce sum number',
        features: { colors: ['blue'], numbers: [1, 9] },
        count: [2, 5],
        hints: ['reduce sum number'],
        unlocks: ['sum'],
      },
      {
        id: 'r4',
        title: 'Biggest Number',
        goal: 'Find the biggest number.',
        intro: `**reduce max** finds the biggest value, **reduce min** finds the smallest:

\`\`\`
reduce min number
\`\`\``,
        solution: 'reduce max number',
        features: { colors: ['green'], numbers: [1, 20] },
        count: [3, 6],
        hints: ['reduce max number'],
        unlocks: ['maxmin'],
      },
      {
        id: 'r5',
        title: 'Smallest Blue',
        goal: 'Find the smallest number on a blue marble.',
        solution: 'filter color is blue\nreduce min number',
        features: { colors: RB.colors, numbers: [1, 20] },
        count: [5, 8],
        hints: ['filter first.', 'filter color is blue\nreduce min number'],
      },
      {
        id: 'r6',
        title: 'Big Points',
        goal: 'Add up the numbers of the big marbles only.',
        solution: 'filter size is big\nreduce sum number',
        features: { colors: ['yellow'], sizes: ['small', 'big'], numbers: [1, 9] },
        count: [4, 7],
        hints: ['filter, then reduce sum.'],
      },
      {
        id: 'r7',
        title: 'Double Score',
        goal: 'Find the pattern!',
        solution: 'map number -> number * 2\nreduce sum number',
        features: { colors: ['red'], numbers: [1, 9] },
        count: [2, 4],
        hints: ['Add the numbers up yourself. Compare with the answer.', 'The answer is always twice the sum. You could double each number first...'],
      },
      {
        id: 'r8',
        title: 'Pattern Party',
        goal: 'Count the marbles that have a pattern (striped or dotted).',
        solution: 'filter pattern is not plain\nreduce count',
        features: { colors: RB.colors, patterns: ['plain', 'striped', 'dotted'] },
        count: [5, 9],
        hints: ['"Has a pattern" means it is not plain.', 'filter pattern is not plain\nreduce count'],
      },
    ],
  },
  {
    id: 'fold',
    title: 'Reduce Masters',
    emoji: '🏆',
    blurb: 'Build your own reduce, step by step.',
    levels: [
      {
        id: 'd1',
        title: 'Sum by Hand',
        goal: 'Add up all the numbers - using "reduce from".',
        intro: `Time to see how reduce *really* works! You keep a **total**. It starts at some number, then every marble updates it:

\`\`\`
reduce from 0 : total + number
\`\`\`

Start with total = 0. For each marble: total becomes total + number. The last total is the answer.

Run it and watch the total grow under each marble!`,
        solution: 'reduce from 0 : total + number',
        features: { colors: ['blue'], numbers: [1, 9] },
        count: [3, 5],
        hints: ['reduce from 0 : total + number'],
        unlocks: ['fold'],
        mustUse: ['fold'],
      },
      {
        id: 'd2',
        title: 'Count by Hand',
        goal: 'Count the marbles - using "reduce from".',
        solution: 'reduce from 0 : total + 1',
        features: ALL5,
        count: [2, 8],
        hints: ['Each marble should add 1 to the total.', 'reduce from 0 : total + 1'],
        mustUse: ['fold'],
      },
      {
        id: 'd3',
        title: 'Piggy Bank',
        goal: 'You have 50 coins. Every marble costs as many coins as its number. How many coins are left?',
        solution: 'reduce from 50 : total - number',
        features: { colors: ['yellow'], numbers: [1, 9] },
        count: [3, 6],
        hints: ['Start from 50, not 0!', 'reduce from 50 : total - number'],
        mustUse: ['fold'],
      },
      {
        id: 'd4',
        title: 'Multiply Them All',
        goal: 'Multiply all the numbers together.',
        solution: 'reduce from 1 : total * number',
        features: { colors: ['purple'], numbers: [1, 5] },
        count: [2, 4],
        hints: ['What should you start from? (Hint: 0 times anything is 0...)', 'reduce from 1 : total * number'],
        mustUse: ['fold'],
      },
      {
        id: 'd5',
        title: 'Doubling Machine',
        goal: 'Find the pattern!',
        solution: 'reduce from 1 : total * 2',
        features: { colors: RBG.colors },
        count: [1, 7],
        hints: ['1 marble -> 2, 2 marbles -> 4, 3 marbles -> 8 ...', 'Start with 1 and double the total for every marble.'],
        mustUse: ['fold'],
      },
      {
        id: 'd6',
        title: 'Grand Finale',
        goal: 'Find the pattern! Use everything you have learned.',
        solution: 'filter size is big\nmap number -> number * 10\nreduce sum number',
        features: { colors: RB.colors, sizes: ['small', 'big'], numbers: [1, 9] },
        count: [4, 7],
        hints: ['Which marbles count? What happens to their numbers?', 'Only big marbles count, and each is worth ten times its number.'],
      },
    ],
  },
]

export const ALL_LEVELS: Level[] = CHAPTERS.flatMap((c) => c.levels)

export function levelIndex(id: string): number {
  return ALL_LEVELS.findIndex((l) => l.id === id)
}

/** All concepts unlocked up to and including the given level. */
export function conceptsUpTo(id: string): Concept[] {
  const idx = levelIndex(id)
  return ALL_LEVELS.slice(0, idx + 1).flatMap((l) => l.unlocks ?? [])
}
