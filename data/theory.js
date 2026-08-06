// ── Shared music-theory constants & helpers ──────────────────────────────
// Single source of truth used by BOTH the trainer (App.jsx) and the chord
// editor (editor/). Keep this pure — no React, no DOM.

// Open-string MIDI notes, low-E (string index 0) to high-e (index 5).
export const OPEN_MIDI = [40, 45, 50, 55, 59, 64];

// Pitch-class names (index 0 = C).
export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// Degree → colour (used for diagram dots and degree chips).
export const DC = {
  'R': '#ff4757', '3': '#ffd93d', 'b3': '#ff9f43', '7': '#ff6b6b', 'b7': '#fdcb6e',
  '9': '#2ed573', '13': '#00b894', '6': '#1e9e77', '#11': '#0fbcf9', '5': '#778ca3',
  'b9': '#7c5cbf', '#9': '#6c5ce7', 'b13': '#9b2335', 'b5': '#fd79a8', '#5': '#a29bfe',
  'bb7': '#b2bec3', '4': '#74b9ff', '2': '#b2d9ff', '11': '#81ecec',
};

// Voicing-technique categories (label + accent colour).
export const CATS = {
  cowboy:  { label: 'Cowboy Chords',   color: '#74b9ff' },
  triad:   { label: 'Movable Triads',  color: '#ffd93d' },
  barre:   { label: 'Barre Chords',    color: '#ff6b6b' },
  shell:   { label: 'Shell Chords',    color: '#a29bfe' },
  drop2:   { label: 'Drop 2',          color: '#4ecdc4' },
  drop3:   { label: 'Drop 3',          color: '#e8a838' },
  drop24:  { label: 'Drop 2 & 4',      color: '#00b894' },
  spread:  { label: 'Spread Voicings', color: '#fdcb6e' },
  quartal: { label: 'Quartal',         color: '#b8f0e6' },
  ext:     { label: 'Extensions',      color: '#fd79a8' },
  altered: { label: 'Altered',         color: '#e17055' },
};

// Short plain-language hint per degree (shown in detail/quiz views).
export const DEG_HINT = {
  'R': 'root — tonal centre', '3': 'major 3rd — makes it major', 'b3': 'minor 3rd — makes it minor',
  'b7': 'dominant 7th — tension', '7': 'major 7th — colour & lift', 'b9': 'flat 9 — dark tension',
  '#9': 'sharp 9 — Hendrix note', '#11': 'sharp 11 — Lydian brightness', 'b13': 'flat 13 — altered colour',
  '5': 'perfect 5th — stability', 'b5': 'flat 5 — tritone', '#5': 'augmented 5th',
  '13': '13th — open extension', '9': '9th — extension', '6': '6th — sweet addition',
  'bb7': 'diminished 7th', '4': 'suspended 4th', '2': 'sus2 open',
};

// Degree label → semitones above the root. Note the enharmonic overlaps
// (e.g. b3 and #9 both = 3 semitones) — that's why a shape alone can't pick a
// single spelling, and the editor offers DEGREE_ALTS to disambiguate.
export const DEGREE_SEMITONE = {
  R: 0, b9: 1, '9': 2, '2': 2, '#9': 3, b3: 3, '3': 4, '4': 5, '11': 5,
  b5: 6, '#11': 6, '5': 7, '#5': 8, b13: 8, '6': 9, '13': 9, bb7: 9, b7: 10, '7': 11,
};

// Default degree spelling per interval (0–11), used when auto-deriving from a shape.
const DEFAULT_DEGREE = ['R', 'b9', '9', 'b3', '3', '4', 'b5', '5', '#5', '6', 'b7', '7'];

// All valid spellings per interval — populates the editor's per-string override.
export const DEGREE_ALTS = {
  0: ['R'], 1: ['b9'], 2: ['9', '2'], 3: ['b3', '#9'], 4: ['3'], 5: ['4', '11'],
  6: ['b5', '#11'], 7: ['5'], 8: ['#5', 'b13'], 9: ['6', '13', 'bb7'], 10: ['b7'], 11: ['7'],
};

// Pitch class (0–11) of a given string at a given fret. fret < 0 = muted.
export const pitchClassAt = (stringIdx, fret) =>
  fret < 0 ? null : (OPEN_MIDI[stringIdx] + fret) % 12;

// Start fret (lowest fretted position; 1 if all open/muted) — matches the
// trainer's diagram convention.
export function computeStartFret(str) {
  const active = str.filter(f => f > 0);
  return active.length ? Math.min(...active) : 1;
}

// Given a fret array and which string holds the root, return a 6-length degree
// array using the default spelling for each interval. Muted strings → null.
// This is what lets the editor avoid hand-typed degrees (and the bug class that
// produced the old mislabeled dom7b13).
export function deriveDegrees(str, rootIdx) {
  if (rootIdx == null || str[rootIdx] < 0) return str.map(() => null);
  const rootPc = pitchClassAt(rootIdx, str[rootIdx]);
  return str.map((f, i) => {
    if (f < 0) return null;
    if (i === rootIdx) return 'R';
    const interval = ((pitchClassAt(i, f) - rootPc) % 12 + 12) % 12;
    return DEFAULT_DEGREE[interval];
  });
}

// Validate a single voicing {str, deg, sf}. Returns { ok, errors }.
export function validateVoicing(v) {
  const errors = [];
  if (!Array.isArray(v.str) || v.str.length !== 6) errors.push('str must have 6 entries');
  if (!Array.isArray(v.deg) || v.deg.length !== 6) errors.push('deg must have 6 entries');
  if (errors.length) return { ok: false, errors };
  let rootPc = null;
  for (let i = 0; i < 6; i++) if (v.deg[i] === 'R' && v.str[i] >= 0) { rootPc = pitchClassAt(i, v.str[i]); break; }
  if (rootPc === null) errors.push('no playable root (R) marked');
  for (let i = 0; i < 6; i++) {
    const d = v.deg[i];
    if (d == null || v.str[i] < 0) {
      if (d != null && v.str[i] < 0) errors.push(`string ${i + 1}: muted but labeled '${d}'`);
      continue;
    }
    if (!(d in DEGREE_SEMITONE)) { errors.push(`string ${i + 1}: unknown degree '${d}'`); continue; }
    if (rootPc !== null) {
      const interval = ((pitchClassAt(i, v.str[i]) - rootPc) % 12 + 12) % 12;
      if (interval !== DEGREE_SEMITONE[d]) errors.push(`string ${i + 1}: '${d}' should sound ${DEGREE_SEMITONE[d]}st but sounds ${interval}st`);
    }
  }
  return { ok: errors.length === 0, errors };
}

// Validate a whole chord list. Returns { ok, errors } with per-chord messages.
export function validateChords(chords) {
  const errors = [];
  const ids = new Set();
  for (const c of chords) {
    if (!c.id) errors.push(`chord "${c.name || '?'}" missing id`);
    else if (ids.has(c.id)) errors.push(`duplicate id "${c.id}"`);
    else ids.add(c.id);
    if (!Array.isArray(c.voicings) || c.voicings.length === 0) { errors.push(`${c.id}: no voicings`); continue; }
    c.voicings.forEach((v, vi) => {
      const r = validateVoicing(v);
      if (!r.ok) r.errors.forEach(e => errors.push(`${c.id} voicing ${vi + 1}: ${e}`));
    });
  }
  return { ok: errors.length === 0, errors };
}
