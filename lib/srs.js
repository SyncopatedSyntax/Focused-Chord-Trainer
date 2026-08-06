// ── Spaced repetition ────────────────────────────────────────────────────
// Lifted from Chord Trainer's App.jsx (SM-2, the same algorithm Anki and Triad
// Trainer use). The only change: the three selectors that read the chord list
// closed over a module-level `CHORDS` import there; here the list is the user's
// own and lives in React state, so it comes in as the first argument.

export const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
export const todayStr = () => new Date().toISOString().split('T')[0];
export const addDays = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().split('T')[0]; };

// SM-2: a correct answer nudges the ease factor up and stretches the interval
// (1 day → 6 days → interval × ef); a miss drops the ease factor and resets the
// interval to tomorrow.
export function updateSRS(card, correct) {
  const ef = card?.ef ?? 2.5, reps = card?.reps ?? 0, interval = card?.interval ?? 1;
  if (correct) {
    const nef = Math.min(2.5, Math.max(1.3, ef + 0.1));
    const nreps = reps + 1;
    const nint = nreps === 1 ? 1 : nreps === 2 ? 6 : Math.round(interval * nef);
    return { ef: nef, interval: nint, reps: nreps, nextDue: addDays(todayStr(), nint) };
  }
  return { ef: Math.max(1.3, ef - 0.2), interval: 1, reps: 0, nextDue: addDays(todayStr(), 1) };
}

// Seeded pseudo-random number generator (mulberry32) — deterministic for a
// given seed, so the day's set stays stable however often you reopen the app.
export function seededRng(seed) {
  return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function strHash(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; } return h; }
export function seededShuffle(arr, seed) {
  const a = [...arr], rng = seededRng(seed);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// The day's review set: chords whose interval has come due, then never-seen
// ones to fill the gap. Seeded by the date so it doesn't reshuffle mid-session.
// `size` is smaller here than Chord Trainer's fixed 5 when the library is tiny —
// a 3-chord library should not claim a 5-chord day.
export function getDailyChords(chords, srsData, mastered, size = 5) {
  const td = todayStr();
  const seed = strHash(td);
  const due = chords.filter(c => srsData[c.id]?.nextDue <= td && !(mastered && mastered.has(c.id)));
  const fresh = chords.filter(c => !srsData[c.id] && !(mastered && mastered.has(c.id)));
  const seen = new Set(); const result = [];
  for (const c of [...seededShuffle(due, seed), ...seededShuffle(fresh, seed + 1)]) {
    if (!seen.has(c.id)) { seen.add(c.id); result.push(c); }
    if (result.length >= size) break;
  }
  return result;
}

// Chords you have ever missed, or whose ease factor has degraded below 2.0.
// Sorted worst-first.
export function getWeakChords(chords, history, srs) {
  const map = {};
  for (const h of history) { if (!map[h.id]) map[h.id] = { ok: 0, n: 0 }; map[h.id].n++; if (h.correct) map[h.id].ok++; }
  const weak = new Set();
  for (const [id, s] of Object.entries(map)) { if (s.ok < s.n) weak.add(id); }
  for (const [id, s] of Object.entries(srs || {})) { if (s.ef < 2.0) weak.add(id); }
  return chords.filter(c => weak.has(c.id)).map(c => ({ ...c, stats: map[c.id] || { ok: 0, n: 0 }, srsEf: srs?.[c.id]?.ef }))
    .sort((a, b) => { const pa = a.stats.n > 0 ? a.stats.ok / a.stats.n : 0.5; const pb = b.stats.n > 0 ? b.stats.ok / b.stats.n : 0.5; return pa - pb; });
}

// Degree+chord combos identified below 70% of the time.
export function getWeakDegrees(chords, degHist) {
  const map = {};
  for (const h of degHist) { const k = h.id + '|' + h.deg; if (!map[k]) map[k] = { id: h.id, deg: h.deg, ok: 0, n: 0 }; map[k].n++; if (h.correct) map[k].ok++; }
  return Object.values(map).filter(r => r.ok / r.n < 0.7)
    .map(r => ({ ...r, chord: chords.find(c => c.id === r.id) })).filter(r => r.chord)
    .sort((a, b) => a.ok / a.n - b.ok / b.n);
}

// The degrees worth asking about for a chord — its colour tones ahead of its
// root and 5th, so the Scale Degree quiz asks what actually characterises it.
export function getCharDegs(chord) {
  const degs = [...new Set((chord.voicings[0].deg || []).filter(Boolean))];
  const nonRoot = degs.filter(d => d !== 'R');
  const prio = ['b9', '#9', '#11', 'b13', '13', '9', 'b7', '7', 'b3', '3', 'b5', '#5', '6', 'bb7', '4', '2', '5'];
  const found = prio.filter(d => nonRoot.includes(d));
  const interesting = found.filter(d => d !== '5');
  return interesting.length > 0 ? interesting.slice(0, 3) : (found.length > 0 ? found.slice(0, 2) : nonRoot.slice(0, 2));
}
