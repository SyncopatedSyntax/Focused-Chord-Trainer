// ── The user's chord library ─────────────────────────────────────────────
// This is the one piece with no counterpart in Chord Trainer. There, chord data
// is a repo file (data/chords.json) imported at module scope; the editor writes
// a copy you commit and redeploy. Here the library IS the user's, so it lives in
// localStorage and a chord saved in the Build tab is schedulable and quizzable
// immediately.
//
// The on-disk shape is deliberately identical to Chord Trainer's chords.json —
// an array of { id, name, sym, cat, movable?, voicings: [{ label, str, deg, sf }] }
// — so libraries move between the two apps in either direction.

import { validateChords, validateVoicing } from '../data/theory.js';
import { serializeArray } from '../components/ui.jsx';

// Every key this app owns is namespaced `fct_`, which is also what makes the
// shared ProgressBackup widget work: it exports/imports by prefix, so one
// backup file carries the library AND the SRS progress.
export const PREFIX = 'fct_';
export const CHORDS_KEY = PREFIX + 'chords';

// Read the library. Never throws and never returns null — a corrupt or
// half-written entry costs you that chord, not the app. Invalid chords are
// dropped rather than surfaced, since there is no way to repair them here; the
// count comes back so the caller can say so.
export function loadChords() {
  let raw;
  try { raw = localStorage.getItem(CHORDS_KEY); } catch (e) { return { chords: [], dropped: 0 }; }
  if (!raw) return { chords: [], dropped: 0 };
  let data;
  try { data = JSON.parse(raw); } catch (e) { return { chords: [], dropped: 0 }; }
  if (!Array.isArray(data)) return { chords: [], dropped: 0 };
  const chords = data.filter(isUsable);
  return { chords, dropped: data.length - chords.length };
}

// A chord is usable if it has an id and at least one voicing that passes the
// same validation the editor enforces at authoring time.
function isUsable(c) {
  if (!c || typeof c !== 'object' || !c.id) return false;
  if (!Array.isArray(c.voicings) || c.voicings.length === 0) return false;
  return validateVoicing(c.voicings[0]).ok;
}

export function saveChords(list) {
  try { localStorage.setItem(CHORDS_KEY, JSON.stringify(list)); return true; }
  catch (e) { return false; }
}

// ── Mutations ────────────────────────────────────────────────────────────
// Each returns the new array; persistence is the caller's job (ChordsContext
// does it once per mutation) so these stay pure and testable.

export const addChord = (list, chord) => [...list, chord];
export const updateChord = (list, id, chord) => list.map(c => (c.id === id ? chord : c));
export const removeChord = (list, id) => list.filter(c => c.id !== id);

// ── Interchange ──────────────────────────────────────────────────────────

// Download the library as chords.json, byte-compatible with Chord Trainer's
// data/chords.json.
export function exportChords(list) {
  const blob = new Blob([serializeArray(list)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'chords.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Read a chords.json from disk. Resolves { chords, errors } — errors are the
// per-chord validation messages so the caller can warn before replacing a
// working library with a broken file.
export function readChordsFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      let data;
      try { data = JSON.parse(ev.target.result); }
      catch (e) { reject(new Error('Not valid JSON')); return; }
      if (!Array.isArray(data)) { reject(new Error('Expected an array of chords')); return; }
      const r = validateChords(data);
      resolve({ chords: data, errors: r.errors });
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });
}

// Merge an imported set into the current library, renaming id collisions rather
// than silently overwriting a chord the user already built.
export function mergeChords(list, incoming) {
  const ids = new Set(list.map(c => c.id));
  const merged = [...list];
  let renamed = 0;
  for (const c of incoming) {
    let id = c.id;
    if (ids.has(id)) {
      let n = 2;
      while (ids.has(`${c.id}${n}`)) n++;
      id = `${c.id}${n}`;
      renamed++;
    }
    ids.add(id);
    merged.push({ ...c, id });
  }
  return { chords: merged, renamed };
}
