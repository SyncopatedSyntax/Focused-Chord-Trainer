// ── Starter chord ────────────────────────────────────────────────────────
// Seeded into the library once, on first run only, so the app opens with
// something to look at instead of six empty states.
//
// This is a SEED, not a shipped chord set — an important distinction given the
// rule in CLAUDE.md against a static chord import. It is copied into
// localStorage exactly once and is the user's from that moment: editable,
// deletable, and never written again. `lib/library.js` records that seeding
// happened under its own key, so deleting this chord does not bring it back.
//
// D7♯5♯9, root on the A string at the 5th fret:
//
//     x  D  F♯  C   F   B♭
//     x  5  4   5   6   6
//        R  3   ♭7  ♯9  ♯5
//
// Chosen deliberately: it has no open strings, so `movable: true` lets the
// detail view transpose it around the neck, and its ♯9 is a spelling override
// (the shape alone derives ♭3, since both are 3 semitones) — so opening it in
// the editor demonstrates the per-string spelling dropdown on the one chord
// the user already has.
export const STARTER_CHORDS = [
  {
    id: 'd7s5s9',
    name: 'D7#5#9',
    sym: 'D7#5#9',
    cat: 'altered',
    movable: true,
    voicings: [
      {
        label: '5th-str root · altered dominant',
        str: [-1, 5, 4, 5, 6, 6],
        deg: [null, 'R', '3', 'b7', '#9', '#5'],
        sf: 4,
      },
    ],
  },
];
