// Smoke test for data/theory.js — the module lifted from Chord Trainer that
// makes it impossible to save a chord with a wrongly-labelled note.
//
// Chord Trainer has no equivalent script on purpose: there, validation is
// enforced live in the editor, which is the only way chord data gets written.
// The same is true here, but this file is a *copy*, and a copy can be subtly
// wrong in a way the UI would happily accept. These assertions pin the maths.
//
//   node scripts/verify.mjs

import {
  deriveDegrees, validateVoicing, computeStartFret, pitchClassAt,
  DEGREE_SEMITONE, DEGREE_ALTS,
} from '../data/theory.js';

let failures = 0;
const check = (name, fn) => {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failures++; console.log(`  ✗ ${name}\n      ${e.message}`); }
};
const eq = (actual, expected, what) => {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${what}\n      expected ${b}\n      got      ${a}`);
};

console.log('\ndata/theory.js');

// ── deriveDegrees: a shape plus a root position determines every label ──────
check('C major open — root on the A string', () => {
  eq(deriveDegrees([-1, 3, 2, 0, 1, 0], 1), [null, 'R', '3', '5', 'R', '3'], 'C major degrees');
});

check('E minor open — root on the low E string', () => {
  eq(deriveDegrees([0, 2, 2, 0, 0, 0], 0), ['R', '5', 'R', 'b3', '5', 'R'], 'E minor degrees');
});

check('G7 open — the b7 lands on the high e', () => {
  eq(deriveDegrees([3, 2, 0, 0, 0, 1], 0), ['R', '3', '5', 'R', '3', 'b7'], 'G7 degrees');
});

check('Dm7 shell — muted strings derive as null', () => {
  eq(deriveDegrees([-1, 5, 3, 5, -1, -1], 1), [null, 'R', 'b3', 'b7', null, null], 'Dm7 degrees');
});

check('A7 open — moving the root re-intervals every string', () => {
  eq(deriveDegrees([-1, 0, 2, 0, 2, 0], 1), [null, 'R', '5', 'b7', '3', '5'], 'A7 degrees');
});

check('no root marked yields all nulls', () => {
  eq(deriveDegrees([-1, 3, 2, 0, 1, 0], null), [null, null, null, null, null, null], 'null root');
  // A root index pointing at a muted string is not a root either.
  eq(deriveDegrees([-1, 3, 2, 0, 1, 0], 0), [null, null, null, null, null, null], 'muted root');
});

// ── validateVoicing: the gate that stops bad data being saved ───────────────
check('a correctly labelled voicing passes', () => {
  const v = { str: [-1, 3, 2, 0, 1, 0], deg: [null, 'R', '3', '5', 'R', '3'], sf: 1 };
  const r = validateVoicing(v);
  if (!r.ok) throw new Error(`expected ok, got: ${r.errors.join('; ')}`);
});

check('a mislabelled degree is rejected with the interval it actually sounds', () => {
  // String 3 (D) at fret 2 is E — a major 3rd above C, not a minor 3rd.
  const v = { str: [-1, 3, 2, 0, 1, 0], deg: [null, 'R', 'b3', '5', 'R', '3'], sf: 1 };
  const r = validateVoicing(v);
  if (r.ok) throw new Error('expected rejection of b3 on a major 3rd');
  if (!r.errors.some(e => e.includes('should sound 3st but sounds 4st'))) {
    throw new Error(`expected an interval mismatch message, got: ${r.errors.join('; ')}`);
  }
});

check('a voicing with no playable root is rejected', () => {
  const v = { str: [-1, 3, 2, 0, 1, 0], deg: [null, '5', '3', '5', '5', '3'], sf: 1 };
  const r = validateVoicing(v);
  if (r.ok) throw new Error('expected rejection');
  if (!r.errors.some(e => e.includes('no playable root'))) throw new Error(`got: ${r.errors.join('; ')}`);
});

check('a muted string carrying a label is rejected', () => {
  const v = { str: [-1, 3, 2, 0, 1, 0], deg: ['R', 'R', '3', '5', 'R', '3'], sf: 1 };
  const r = validateVoicing(v);
  if (r.ok) throw new Error('expected rejection');
  if (!r.errors.some(e => e.includes('muted but labeled'))) throw new Error(`got: ${r.errors.join('; ')}`);
});

check('wrong array lengths are rejected before anything else', () => {
  if (validateVoicing({ str: [0, 0, 0], deg: [null, 'R', '3', '5', 'R', '3'] }).ok) throw new Error('short str accepted');
  if (validateVoicing({ str: [-1, 3, 2, 0, 1, 0], deg: ['R'] }).ok) throw new Error('short deg accepted');
});

// ── Enharmonic spellings: why the editor offers a per-string dropdown ───────
check('every alternative spelling maps to the interval it claims', () => {
  for (const [interval, alts] of Object.entries(DEGREE_ALTS)) {
    for (const d of alts) {
      if (DEGREE_SEMITONE[d] !== Number(interval)) {
        throw new Error(`${d} is listed under interval ${interval} but DEGREE_SEMITONE says ${DEGREE_SEMITONE[d]}`);
      }
    }
  }
});

check('an overridden spelling still validates (b3 respelt as #9)', () => {
  // 3 semitones is genuinely ambiguous — b3 and #9 are the same pitch.
  const derived = deriveDegrees([-1, 3, 1, 3, -1, -1], 1); // Cm7 shell
  eq(derived, [null, 'R', 'b3', 'b7', null, null], 'Cm7 derives b3');
  const respelt = { str: [-1, 3, 1, 3, -1, -1], deg: [null, 'R', '#9', 'b7', null, null], sf: 1 };
  const r = validateVoicing(respelt);
  if (!r.ok) throw new Error(`#9 respelling rejected: ${r.errors.join('; ')}`);
});

// ── Small helpers ──────────────────────────────────────────────────────────
check('computeStartFret picks the lowest fretted note, or 1', () => {
  eq(computeStartFret([-1, 3, 2, 0, 1, 0]), 1, 'open C');
  eq(computeStartFret([-1, 5, 3, 5, -1, -1]), 3, 'Dm7 at the 3rd fret');
  eq(computeStartFret([-1, -1, -1, -1, -1, -1]), 1, 'all muted');
  eq(computeStartFret([0, 0, 0, 0, 0, 0]), 1, 'all open');
});

check('pitchClassAt matches standard tuning', () => {
  eq(pitchClassAt(0, 0), 4, 'low E open is E');
  eq(pitchClassAt(1, 3), 0, 'A string 3rd fret is C');
  eq(pitchClassAt(5, 0), 4, 'high e open is E');
  eq(pitchClassAt(0, -1), null, 'muted has no pitch');
});

console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
