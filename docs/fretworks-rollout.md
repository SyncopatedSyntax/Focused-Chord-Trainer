# Rolling a change across the Fretworks toolbox

Written while adding Focused Chord Trainer as the toolbox's seventh tool. The
specifics are that rollout; the mechanism applies to any change to
`@fretworks/design`.

## The thing that will catch you

Every app depends on the design package as a **git dependency pinned to an exact
commit** in its own `package-lock.json`:

```
"node_modules/@fretworks/design": {
  "resolved": "git+ssh://git@github.com/SyncopatedSyntax/fretworks-design.git#<sha>"
}
```

`package.json` says `github:SyncopatedSyntax/fretworks-design` with no ref, which
reads as "track the default branch" — but npm installs from the lockfile, and
Vercel builds with the lockfile. So **merging a change to `fretworks-design`
changes nothing in any deployed app.** Each consumer has to be repinned:

```bash
npm install @fretworks/design@github:SyncopatedSyntax/fretworks-design
git commit -am "Repin @fretworks/design to <sha>"
git push
```

This is not a rare edge case. It applies to all eight consumers — the shell and
all seven trainers — on every single design-package change.

The failure mode is quiet: nothing errors, nothing warns, the build passes, and
the new thing simply isn't there. When a registry change appears to have had no
effect, check the lockfile pin before looking anywhere else.

### If the pinning itself becomes tedious

Replacing the pin with `github:SyncopatedSyntax/fretworks-design#main` in each
`package.json` would make every app pick up design changes on its next build. It
trades reproducible builds for automatic propagation — a redeploy could then
change an app's chrome without any commit to that app. Not done here; noted as
the obvious alternative if the repinning chore outweighs the reproducibility.

## What a new tool touches

Adding a tool is four repos, in this order:

1. **`fretworks-design`** — an entry in `TOOLS` and `LEARNING_PATH` in
   `src/tools.js`. `AppHeader` and `TabBar` resolve a tool's name and accent
   through `toolByKey()` and nothing else, so without this the app's header is
   nameless and it never appears in any `ToolDrawer`.
2. **The tool's own repo** — Vite `base: '/<key>/'`, a `vercel.json` rewriting
   `/<key>/(.*)` → `/$1`, and a Vercel project.
3. **`fretworks` shell** — two `vercel.json` rewrites pointing at the tool's
   deployment, the key added to `ZONE_RE` in `public/sw.js`, and a
   `public/shots/<key>.webp` screenshot.
   - `ZONE_RE` is load-bearing: without it a `/<key>` navigation falls through
     to the catch-all rewrite and is served the shell's `index.html`, which
     renders the marketing brochure — a click-loop.
   - The brochure looks up `SHOTS[t.key]` for **every** entry in `TOOLS`, so a
     tool with no screenshot renders `<img src={undefined}>`. Screenshots are
     360×782 WebP.
4. **Every other app** — repin, per the section above, or the new tool is
   missing from all their side menus.

Order matters. The shell's rewrites point at a deployment that must already
exist, so merge that last; merging it early makes `/<key>` a dead route.

## Status of the Focused Chord Trainer rollout

Done:

- `fretworks-design` — registry entry merged as `bc5d613`.
- `Focused-Chord-Trainer` — the app, repinned to `bc5d613`.
- `fretworks` — `/focus` rewrites, `ZONE_RE`, screenshot, repinned to
  `bc5d613`. Merged as `24c456f`; service worker cache bumped to `v5`.

Outstanding — each still pinned to `cb34860`, so each shows six tools in its
drawer instead of seven:

| Repo | Default branch |
| --- | --- |
| `Chord-Trainer` | `main` |
| `triads-trainer` | `master` |
| `circle-of-fifths` | `main` |
| `DiatonicChordsTrainer` | `main` |
| `MelodicMinorTrainer` | `main` |
| `altered-trainer` | `master` |

For each: repin, confirm `package-lock.json` is the only changed file, confirm
`grep -c 'Focused Chord Trainer' node_modules/@fretworks/design/dist/index.js`
returns 1, run `npm run build`, then commit the lockfile and push to the default
branch. The bump spans exactly one upstream commit — `+12` lines in
`src/tools.js`, nothing else — so there is no behaviour change beyond the new
menu entry.

Verify by opening any of them and checking the hamburger menu lists seven tools.
A stale six after deploying usually means the service worker is serving a cached
bundle; hard reload.
