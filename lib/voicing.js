// Voicing-level helpers lifted from Chord Trainer's App.jsx. Pure — a voicing
// is { str, deg, sf } and these only ever read or return new ones.

import { OPEN_MIDI } from '../data/theory.js';

// Pitch class (0–11) of the voicing's root, or null when no playable root is
// marked.
export function getRootNote(v) {
  for (let i = 0; i < v.str.length; i++) {
    if (v.deg?.[i] === 'R' && v.str[i] >= 0) return ((OPEN_MIDI[i] + v.str[i]) % 12 + 12) % 12;
  }
  return null;
}

// Which of the 12 roots this shape can actually be moved to. A shape with open
// strings can't move at all, and a shape can't shift below the 1st fret — so the
// answer is usually a subset, not all 12.
export function getValidTransposeRoots(v) {
  const rootIdx = v.deg.findIndex((d, i) => d === 'R' && v.str[i] > 0);
  if (rootIdx === -1) return new Set();
  const currentNote = ((OPEN_MIDI[rootIdx] + v.str[rootIdx]) % 12 + 12) % 12;
  const valid = new Set();
  for (let target = 0; target < 12; target++) {
    let shift = ((target - currentNote) + 12) % 12; if (shift > 6) shift -= 12;
    const newStr = v.str.map(f => f > 0 ? f + shift : f);
    if (v.str.every((f, i) => f <= 0 || newStr[i] >= 1)) valid.add(target);
  }
  return valid;
}

// Slide the whole shape to a new root, picking the shift that keeps it nearest
// its current position. Returns the original voicing unchanged if the move
// would push a fretted note off the nut.
export function transposeVoicing(v, targetNote) {
  const rootIdx = v.deg.findIndex((d, i) => d === 'R' && v.str[i] > 0);
  if (rootIdx === -1) return v;
  const currentNote = ((OPEN_MIDI[rootIdx] + v.str[rootIdx]) % 12 + 12) % 12;
  let shift = ((targetNote - currentNote) + 12) % 12; if (shift > 6) shift -= 12; if (shift === 0) return v;
  const newStr = v.str.map(f => f > 0 ? f + shift : f);
  if (!v.str.every((f, i) => f <= 0 || newStr[i] >= 1)) return v;
  const active = newStr.filter(f => f > 0);
  return { ...v, str: newStr, sf: Math.max(1, active.length > 0 ? Math.min(...active) : 1) };
}
