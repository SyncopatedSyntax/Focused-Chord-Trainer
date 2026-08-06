# Focused Chord Trainer — project context

A React PWA guitar chord trainer where **the user builds the chord library**.
SM-2 spaced repetition and the same quizzes as Chord Trainer, but no shipped
chord data and no progressions. Second chord-vocabulary tool in the
**Fretworks** toolbox (sibling to Chord Trainer, Triad Trainer,
DiatonicChordsTrainer, MelodicMinorTrainer, AlteredTrainer, Circle of Fifths).
Single dev + end user: Zak.

- Toolbox-wide conventions (git-dep workflow, multi-zone, single PWA,
  verify-in-prod, naming): the Fretworks root `CLAUDE.md`.
- Most of this app is lifted from **Chord Trainer**
  (`SyncopatedSyntax/Chord-Trainer`). When changing shared logic, check that
  repo first — it is the reference implementation for the theory module, the
  audio stack, and both quizzes.

## The one structural difference from Chord Trainer

Chord Trainer imports `data/chords.json` at module scope; its editor writes that
file, which you commit and redeploy. Here the library is the **user's**, lives in
`localStorage`, and is edited in-app — so a chord saved in the Build tab is
schedulable and quizzable on the next render.

Consequently there is no module-level `CHORDS` constant. Everything reads the
list from `lib/ChordsContext.jsx`, and the selectors in `lib/srs.js`
(`getDailyChords`, `getWeakChords`, `getWeakDegrees`) take `chords` as their
first argument rather than closing over an import. **Never reintroduce a
static chord import** — it would silently shadow the user's library.

`data/starter.js` is the one file that looks like it breaks that rule and does
not. It is a **seed**, not a shipped set: `loadChords()` copies it into storage
exactly once, on the first run of a browser that has never been seeded, and it
is the user's from that moment — editable, deletable, never rewritten. The
`fct_seeded` key is what makes deletion stick; without it an empty library and a
never-seeded one are indistinguishable and the starter would resurrect on every
load. Nothing else may import `STARTER_CHORDS`.

## Storage

Every key is namespaced `fct_`, which is load-bearing: `ProgressBackup` from
`@fretworks/design` exports and imports by prefix, so one backup file carries the
library *and* the progress with no per-tool wiring.

- `fct_chords` — the library (array, same shape as Chord Trainer's chords.json)
- `fct_seeded` — set once the starter chord has been offered; see above
- `fct_srs` — SM-2 schedule · `fct_hist` — quiz history · `fct_degh` — degree
  quiz results · `fct_mastered` — manually retired chords
- `fct_launches`, `fct_audio_hint_launch*` — audio-hint suppression counters

`loadChords()` validates on read and **drops** entries that fail rather than
throwing; App surfaces the count in a dismissible banner. It does not rewrite
storage, so a bad entry stays on disk and can be recovered from a backup.

## Theory data model

`data/theory.js` is a verbatim copy of Chord Trainer's — pure, no React/DOM.
`deriveDegrees(str, rootIdx)` auto-derives degree labels from a fret shape plus a
root position, so a voicing can't be hand-labelled wrong; `validateVoicing` /
`validateChords` re-check that every label matches the pitch the fret actually
produces. `DEGREE_ALTS` drives the Build tab's per-string dropdown for genuinely
ambiguous intervals (♭3/♯9, ♯5/♭13, 6/13/♭♭7).

Unlike Chord Trainer, this repo **does** carry a `scripts/verify.mjs`. Not
because the live gate changed — the Build tab still enforces validation at
authoring time — but because `theory.js` here is a *copy*, and a copy can be
subtly wrong in ways the UI would accept. Run `npm run verify` after touching it.

## Tabs

- **Today** 🌅 — the SRS review queue. Snapshots the day's set and the schedule
  at mount so grading can't reorder the cards underneath you.
- **Library** 📚 — search, category strip, detail view with transpose, audio,
  degree guide, and the mastered toggle. Deliberately **no** Family/Builder
  filter panel (see README).
- **Build** ✏️ — the chord editor, ported from Chord Trainer's
  `editor/Editor.jsx`. Writes to the context, not to a file. Also exports and
  imports `chords.json` for interchange with Chord Trainer.
  Its upstream is a **desktop** editor, so it is the one tab that needed real
  responsive work (`lib/useIsNarrow.js`, 720px). Below that width the list and
  the editor become two views rather than two columns. The grid uses
  `minmax(0, 1fr)`, not `1fr` — a `1fr` track's automatic minimum is
  `min-content`, so a wide child would stretch the column past the viewport
  instead of being constrained by it. That regression is invisible to a
  `document.documentElement.scrollWidth` check, because the overflow happens
  inside App's scroll container; measure that element instead.

  **The shape is entered by tapping the diagram** —
  `components/EditableFretboard.jsx`. It replaced six rows of sixteen fret
  buttons, which worked but pushed the live preview off the top of a phone
  screen: you could not see the shape while entering it. The diagram is now the
  control, so the shape and the means of changing it cannot drift apart, and
  the shape panel sits **above** the metadata for the same reason. Interaction:
  tap a cell to fret that string (tapping the same cell again mutes it), tap
  the marker above a string to toggle open/muted, tap the **R** row under the
  grid to mark the root. Degrees render inside the dots, so the only per-string
  control left is a spelling `<select>` for the genuinely ambiguous intervals
  (`DEGREE_ALTS`) — previously every string carried a mostly read-only chip.
  - Six frets show at once; `winStart` lives in `BuildTab` (not the board) so
    opening a chord can aim the window at it via `windowFor()`. Notes outside
    the window render as dashed ghosts labelled with their real fret, so a
    shape is never silently half-invisible.
  - **`App.jsx` sets `svg{pointer-events:none}` globally**, re-enabled only for
    elements with an inline `cursor` style. React's `onClick` attaches by
    delegation and emits no `onclick` attribute, so the rule's `svg [onclick]`
    half never matches a React handler. **Every tappable SVG node needs its own
    inline `cursor`** or the tap silently does nothing. `ClickableDiagram` has
    always depended on this too.
  - Geometry is sized so a cell is ~45×52 CSS px at 393px width — past the 44px
    touch minimum. `LM` (left gutter) must clear the word "root", which is
    wider than the two-digit fret numbers.

  The **Symbol** field has its own keypad (`SymbolField` in `components/ui.jsx`)
  because Δ, ø and ° are absent from the iOS keyboard and ♭/♯ are effectively
  unreachable. Insertion is caret-aware rather than append-only, and each chip
  cancels the pointerdown that would otherwise blur the input — without that,
  iOS closes the keyboard and drops the caret on every tap.
- **Quiz** 🎯 — Name↔Shape and the Scale Degree trainer. Gated below 4 chords;
  the Scale Degree tier picker dims degrees no chord in the library contains.
- **Weak** 💪 — misses and low ease factors, with a scoped drill.
- **Settings** ⚙️ — `ProgressBackup`, build stamp, update button.

## Audio

`lib/audio.js` is copied from Chord Trainer's `App.jsx` (**not** its simpler
`editor/audio.js`, which lacks both iOS layers). Web Audio pluck synthesis, the
shared master bus with a limiter, idle-suspend, and the two-layer iOS
silent-switch fix: `navigator.audioSession.type='playback'` at module load, plus
a looping silent `<audio>` element for older iOS. `AudioHintPanel` shows only on
iOS builds without the Audio Session API. Treat all of this as the toolbox
standard — copy changes from Chord Trainer rather than diverging.

## Fretworks integration

Vite `base: '/focus/'`, served as a Vercel zone. Registry key `focus`, accent
teal `#4ecdc4`, path `/focus/`.

`AppHeader` and `TabBar` resolve name and accent through the registry only, so
`components/FocusHeader.jsx` falls back to the local descriptor in `lib/tool.js`
when `toolByKey('focus')` is undefined. **Keep `lib/tool.js` in sync with
`fretworks-design/src/tools.js`.** The shell also needs `/focus` in its
`vercel.json` rewrites and in `public/sw.js`'s `ZONE_RE`.

`@fretworks/design` is a git dep **pinned to an exact commit** in every
consumer's `package-lock.json`, and Vercel builds from the lockfile — so merging
a change to that package changes nothing in any deployed app until each of the
eight consumers is repinned (`npm install @fretworks/design@github:SyncopatedSyntax/fretworks-design`).
It fails quietly: the build passes and the new thing just isn't there.
`docs/fretworks-rollout.md` has the full sequence for shipping a toolbox-wide
change, and tracks which sibling apps are still on the old pin.

## Before shipping any change

- `npm run build` must pass.
- `npm run verify` must pass if `data/theory.js` was touched.
- If touching the Build tab or the theory module, check in the browser that a
  deliberately wrong shape still blocks Save — that is the correctness gate.
