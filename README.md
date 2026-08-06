# 🎯 Focused Chord Trainer

A guitar chord trainer for a library **you build yourself**. Add a chord by shape
on a visual fretboard, and it immediately joins a spaced-repetition schedule and
the quizzes. No preloaded 200-chord set to wade through — just the chords you're
actually working on.

A leaner sibling of [Chord Trainer](https://github.com/SyncopatedSyntax/Chord-Trainer),
and the second chord-vocabulary tool in the **Fretworks** toolbox.

---

## What it does

- **Build** ✏️ — a visual chord editor. Set each string's fret, mark the root,
  and the scale degrees derive themselves from the shape. A note can't be saved
  with a label it doesn't sound. Where a pitch is genuinely ambiguous (♭3 vs ♯9,
  ♯5 vs ♭13) a per-string dropdown lets you pick the spelling you mean.
- **Today** 🌅 — an SM-2 scheduler (the algorithm Anki uses) surfaces the day's
  review set. Get a chord right and it comes back later; get it wrong and it
  comes back tomorrow.
- **Library** 📚 — browse what you've built, with search, category filter,
  transpose, audio, and a per-degree guide. Mark chords mastered to retire them
  from the rotation.
- **Quiz** 🎯 — Name→Shape, Shape→Name, or mixed; plus a **Scale Degree**
  trainer where you tap the dot matching a requested degree. Unlocks at 4
  chords, since a multiple-choice question needs something to choose between.
- **Weak** 💪 — chords and degree+chord combos you keep missing, with a one-tap
  drill.
- **Backup** 📦 — one JSON file carries your whole library *and* your practice
  progress.

Everything lives in `localStorage`. There is no backend and no account, so the
export in Settings is the only copy of your work that survives a lost phone.

## What it deliberately doesn't do

No chord progressions — no progression library, no Roman-numeral transposition,
no "progression of the day", no progression editor. That's Chord Trainer's job.
Spaced repetition, which is a different thing that happens to share the word
"progression", is here in full.

The Library also drops Chord Trainer's dual Family/Builder filter panel. Those
seven sonic-family tests and the additive triad→7th→extensions picker exist to
make a fixed 200-voicing set navigable; a library you built yourself is a few
dozen chords you already know.

---

## Tech stack

- **React 18** + **Vite 5**, single-page
- **Web Audio API** for sound — no audio assets
- **[@fretworks/design](https://github.com/SyncopatedSyntax/fretworks-design)**
  for shared chrome (header, tab bar, tool drawer, backup widget)
- No backend, no database

## Getting started

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install      # install dependencies
npm run dev      # dev server at http://localhost:5173/focus/
npm run build    # production build to dist/
npm run preview  # serve the production build
npm run verify   # smoke-test the degree derivation + validation maths
```

## Project structure

```
index.html            HTML entry
main.jsx              Mount + ChordsProvider
App.jsx               Tab routing, practice-state persistence, page chrome
pwa.js                In-app "Update" helper (the shell owns the service worker)

data/
  theory.js           Degree maths, derivation, validation — lifted from Chord Trainer
components/
  ChordDiagram.jsx    Fretboard SVG
  ClickableDiagram.jsx  Tappable variant, for the Scale Degree quiz
  ChordDetail.jsx     Detail view with transpose + degree guide
  PlayButtons.jsx     Strum / arpeggio
  FocusHeader.jsx     AppHeader, with a local fallback (see below)
  AudioHintPanel.jsx  Old-iOS "no sound?" hint
  ui.jsx              Button/panel styles, Field, EmptyState
lib/
  library.js          The user's chord library in localStorage
  ChordsContext.jsx   Provides it to every tab
  srs.js              SM-2 + daily/weak selectors
  audio.js            Pluck synthesis + the two-layer iOS silent-switch fix
  voicing.js          Root detection + transposition
  tool.js             This app's Fretworks registry descriptor
tabs/
  TodayTab.jsx  LibraryTab.jsx  BuildTab.jsx  QuizTab.jsx  WeakTab.jsx  SettingsTab.jsx
scripts/
  verify.mjs          Asserts theory.js against known shapes
```

## Chord data model

Identical to Chord Trainer's `data/chords.json`, so libraries move between the
two apps in either direction — export here, drop it in that repo, or import that
repo's 200+ voicings here as a starting point.

```json
{
  "id": "cmaj",
  "name": "C Major",
  "sym": "C",
  "cat": "cowboy",
  "voicings": [
    { "label": "Open", "str": [-1, 3, 2, 0, 1, 0], "deg": [null, "R", "3", "5", "R", "3"], "sf": 1 }
  ]
}
```

- **`str`** — fret per string, low-E to high-e. `-1` = muted, `0` = open.
- **`deg`** — scale degree per string, parallel to `str`; `null` where muted.
  Derived from the shape, never hand-typed.
- **`sf`** — start fret shown on the diagram (computed).
- **`movable`** (optional) — `true` for transposable shapes with no open strings.
- **`cat`** — voicing technique: `cowboy`, `triad`, `barre`, `shell`, `drop2`,
  `drop3`, `drop24`, `spread`, `quartal`, `ext`, `altered`.

One voicing per chord. The array is kept for format compatibility; for a second
position, add a second chord.

## Fretworks integration

Served at `/focus/` as a Vercel zone under the unified Fretworks origin, with
accent teal `#4ecdc4`. Two companion changes complete the wiring:

- **`fretworks-design`** — a `focus` entry in `src/tools.js` (`TOOLS` +
  `LEARNING_PATH`). `AppHeader` and `TabBar` read a tool's name and accent from
  there. Until it merges, `components/FocusHeader.jsx` renders the same chrome
  from the local descriptor in `lib/tool.js`, so the app is correct either way —
  keep the two in sync.
- **`fretworks`** shell — `/focus` rewrites in `vercel.json` and `focus` added
  to the `ZONE_RE` in `public/sw.js`, plus a `public/shots/focus.webp`
  screenshot for the launcher grid.

## Credits

Made with 🎸 by **Zak** ([@SyncopatedSyntax](https://github.com/SyncopatedSyntax)).
If it's useful, you can [buy me a coffee](https://ko-fi.com/syncopatedsyntax) ☕.
