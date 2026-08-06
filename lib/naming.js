// Naming a chord from the shape the user just built.
//
// The Build tab derives every note's scale degree from the frets and the root
// (data/theory.js), so by the time a shape has a root and a third it already
// knows what chord it is — the user should not have to tell it again. This
// module turns that degree set into the chord's name and symbol.
//
// Deliberately conservative: it matches against an explicit table and returns
// null for anything not on it, so an unusual voicing leaves the fields blank
// rather than being labelled with a confident guess. A wrong auto-name is
// worse than no auto-name.
//
// Two normalisations make the table cover real guitar voicings:
//
//   1. The perfect 5th is dropped before matching. It is the first note
//      guitarists omit and it never changes the chord's name — without this,
//      a shell voicing like R-3-b7 would match nothing.
//   2. Degrees are keyed by their own labels, not by pitch. The user's
//      spelling choice is information: b3 and #9 sound identical, and it is
//      the label that says whether R-3-b7-#9 is an altered dominant.
//
// Symbols follow the house convention in Chord Trainer's data/chords.json —
// ASCII, with the root letter included: C, Em, Cmaj7, Dsus4, E7#9, A5.

import { NOTE_NAMES, OPEN_MIDI, DEGREE_SEMITONE } from '../data/theory.js';

// Canonical key for a degree set: sorted by semitone, then label, so the
// lookup is order-independent. Both the table and the query go through this.
const key = degs => [...new Set(degs)]
  .sort((a, b) => (DEGREE_SEMITONE[a] - DEGREE_SEMITONE[b]) || (a < b ? -1 : 1))
  .join(',');

// [degrees without the 5th] → chord suffix. `word` is set only where the name
// column in chords.json spells the quality out ("C Major", not "C").
const TABLE = [
  // Triads
  [['R', '3'], '', 'Major'],
  [['R', 'b3'], 'm', 'Minor'],
  [['R', 'b3', 'b5'], 'dim', 'Diminished'],
  [['R', '3', '#5'], 'aug', 'Augmented'],
  [['R', '4'], 'sus4'],
  [['R', '9'], 'sus2'],
  [['R', '2'], 'sus2'],
  // Sixths
  [['R', '3', '6'], '6'],
  [['R', 'b3', '6'], 'm6'],
  [['R', '3', '6', '9'], '6/9'],
  // Sevenths
  [['R', '3', '7'], 'maj7'],
  [['R', '3', 'b7'], '7'],
  [['R', 'b3', 'b7'], 'm7'],
  [['R', 'b3', '7'], 'mMaj7'],
  [['R', 'b3', 'b5', 'b7'], 'm7b5'],
  [['R', 'b3', 'b5', 'bb7'], 'dim7'],
  [['R', '3', '#5', '7'], 'maj7#5'],
  // Altered dominants
  [['R', '3', '#5', 'b7'], '7#5'],
  [['R', '3', 'b5', 'b7'], '7b5'],
  [['R', '3', 'b7', 'b9'], '7b9'],
  [['R', '3', 'b7', '#9'], '7#9'],
  [['R', '3', 'b7', '#11'], '7#11'],
  [['R', '3', '#5', 'b7', '#9'], '7#5#9'],
  [['R', '3', '#5', 'b7', 'b9'], '7#5b9'],
  [['R', '3', 'b5', 'b7', '#9'], '7b5#9'],
  // Added notes and extensions
  [['R', '3', '9'], 'add9'],
  [['R', 'b3', '9'], 'madd9'],
  [['R', '3', 'b7', '9'], '9'],
  [['R', 'b3', 'b7', '9'], 'm9'],
  [['R', '3', '7', '9'], 'maj9'],
  [['R', 'b3', '7', '9'], 'mMaj9'],
  [['R', '3', 'b7', '9', '13'], '13'],
  [['R', '3', 'b7', '13'], '13'],
  [['R', 'b3', 'b7', '11'], 'm11'],
  [['R', '3', '7', '#11'], 'maj7#11'],
];

const LOOKUP = new Map(TABLE.map(([degs, sym, word]) => [key(degs), { sym, word }]));

// The root's pitch class, or null when no playable root is marked.
export function rootPitchClass(str, rootIdx) {
  if (rootIdx == null || !str || str[rootIdx] == null || str[rootIdx] < 0) return null;
  return (OPEN_MIDI[rootIdx] + str[rootIdx]) % 12;
}

// `str` = 6 frets (-1 muted), `deg` = 6 degree labels, `rootIdx` = string
// carrying the root. Returns { name, sym } or null when the shape is not
// recognisable — too few notes, no root, or a voicing outside the table.
export function identifyChord(str, deg, rootIdx) {
  const pc = rootPitchClass(str, rootIdx);
  if (pc == null) return null;
  const note = NOTE_NAMES[pc];

  const present = [];
  for (let i = 0; i < 6; i++) {
    if (str[i] < 0) continue;
    const d = deg?.[i];
    if (d != null && d in DEGREE_SEMITONE) present.push(d);
  }
  const all = new Set(present);
  if (!all.has('R')) return null;

  // A bare root-and-fifth is a power chord — the one shape the 5th defines.
  if (all.size === 2 && all.has('5')) return { name: `${note}5`, sym: `${note}5` };
  if (all.size < 2) return null;

  const hit = LOOKUP.get(key(present.filter(d => d !== '5')));
  if (!hit) return null;

  const sym = note + hit.sym;
  return { name: hit.word ? `${note} ${hit.word}` : sym, sym };
}
