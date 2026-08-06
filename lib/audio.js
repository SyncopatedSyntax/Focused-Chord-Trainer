// ── Web Audio pluck synthesis ────────────────────────────────────────────
// Lifted verbatim from Chord Trainer's App.jsx — that file is the toolbox's
// reference implementation of the iOS silent-switch fix and the shared master
// bus, so this is a copy rather than a rewrite. (Chord Trainer also has a
// simpler editor/audio.js; it is deliberately NOT the one used here, because it
// lacks both iOS layers.)

import { OPEN_MIDI } from '../data/theory.js';

let _ctx = null, _unlocked = false, _master = null;

// ── iOS silent-switch fix, layer 1 (iOS 16.4+) ────────────────────────────
// Audio Session API: declare this page as real media playback. Web Audio then
// plays through the "playback" session category — same as the Music app — and
// ignores the hardware ringer/silent switch. Feature-detected; harmless elsewhere.
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}

export function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

// Shared master bus — keeps the summed amplitude of dense voicings (up to ~30
// oscillators) below the clipping ceiling instead of every voice hitting the
// destination directly. Created once per context.
function getMaster(ctx) {
  if (!_master || _master.context !== ctx) {
    _master = ctx.createGain(); _master.gain.value = 0.5;
    // Gentle limiter after the master so fast repeated strums don't stack/clip.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.knee.value = 20; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.25;
    _master.connect(comp); comp.connect(ctx.destination);
  }
  return _master;
}

// Idle-suspend: release the audio session when nothing is sounding so iOS stops
// showing "now playing" after the sound ends; getCtx() resumes it on the next
// play. (Toolbox audio standard — see Fretworks root CLAUDE.md → Audio.)
let _idleTimer = null, _idleEnd = 0;
function bumpIdle(ctx, end) {
  _idleEnd = Math.max(_idleEnd, end);
  if (_idleTimer) clearTimeout(_idleTimer);
  _idleTimer = setTimeout(() => {
    _idleTimer = null;
    if (ctx.currentTime < _idleEnd - 0.05) return;
    if (ctx.state === 'running') ctx.suspend().catch(() => {});
  }, Math.max(0, (_idleEnd - ctx.currentTime) * 1000) + 400);
}

// ── iOS silent-switch fix, layer 2 (older iOS without the Audio Session API) ──
// A real <audio> element that is *continuously playing* promotes the session to
// "playback", which bypasses the silent switch (the unmute.js technique). It has
// to keep looping for the life of the page — playing a silent MP3 once and
// discarding it does not make the promotion stick.
// Inline silent MP3 (minimal valid MP3 frame, base64 encoded).
const SILENT_MP3 = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAFhpbmcAAAAPAAAAAwAAA7AAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tb////////////////////////////////////////////////////////////////AAAA8ExBTUUzLjk5LjVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=';
let _silentLoop = null;
function startSilentLoop() {
  // Only needed on iOS builds too old for navigator.audioSession (layer 1).
  if (navigator.audioSession || !/iphone|ipad|ipod/i.test(navigator.userAgent)) return;
  try {
    if (!_silentLoop) { _silentLoop = new Audio(SILENT_MP3); _silentLoop.loop = true; }
    if (_silentLoop.paused) {
      // Must run inside a user gesture — callers are tap handlers.
      const p = _silentLoop.play();
      if (p && p.catch) p.catch(() => { _silentLoop = null; }); // retry on a later tap
    }
  } catch (e) { _silentLoop = null; }
}

function unlockAudio() {
  startSilentLoop(); // re-checked every play: iOS pauses media on backgrounding
  if (_unlocked) return;
  // Unlock the Web Audio context (must happen inside a user gesture)
  const ctx = getCtx();
  const buf = ctx.createBuffer(1, 1, 22050); const src = ctx.createBufferSource();
  src.buffer = buf; src.connect(ctx.destination); src.start(0);
  ctx.resume().then(() => { _unlocked = true; });
}

// Harmonic-series pluck: a sine fundamental plus 4 partials, each low-passed and
// decaying, which reads as a plucked string without any audio assets.
function pluckNote(ctx, freq, when, vol = 0.16) {
  const master = getMaster(ctx);
  [[1, 1.0], [2, 0.45], [3, 0.22], [4, 0.09], [6, 0.04]].forEach(([h, a]) => {
    const osc = ctx.createOscillator(), g = ctx.createGain(), filt = ctx.createBiquadFilter();
    osc.type = 'sine'; osc.frequency.value = freq * h; filt.type = 'lowpass'; filt.frequency.value = Math.min(3200, freq * h * 3);
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vol * a, when + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, when + (h === 1 ? 1.6 : 0.9));
    osc.connect(filt); filt.connect(g); g.connect(master); osc.start(when); osc.stop(when + 2);
  });
}

const midiToHz = m => 440 * Math.pow(2, (m - 69) / 12);

// First-play notification. App registers a callback so the old-iOS audio hint
// can appear the first time the user actually plays something; a plain module
// registry avoids DOM events and Strict Mode double-fire problems.
let _onFirstPlay = null;
let _firstPlayFired = false;
export const registerFirstPlay = cb => { _onFirstPlay = cb; };
export const firstPlayFired = () => _firstPlayFired;

export function playVoicing(v, mode) {
  unlockAudio();
  if (!_firstPlayFired) {
    _firstPlayFired = true;
    if (_onFirstPlay) { _onFirstPlay(); _onFirstPlay = null; }
  }
  const ctx = getCtx(), now = ctx.currentTime + 0.04;
  const notes = v.str.map((f, i) => f >= 0 ? midiToHz(OPEN_MIDI[i] + f) : null).filter(Boolean);
  const gap = mode === 'arp' ? 0.10 : 0.016;
  notes.forEach((hz, i) => pluckNote(ctx, hz, now + i * gap));
  bumpIdle(ctx, now + (notes.length - 1) * gap + 2);
}
