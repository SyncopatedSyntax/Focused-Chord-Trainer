import { useState, useEffect, useCallback, useRef } from 'react';
import { TabBar } from '@fretworks/design';
import FocusHeader from './components/FocusHeader.jsx';
import AudioHintPanel from './components/AudioHintPanel.jsx';
import { useChords } from './lib/ChordsContext.jsx';
import { PREFIX } from './lib/library.js';
import { updateSRS, todayStr } from './lib/srs.js';
import { registerFirstPlay, firstPlayFired } from './lib/audio.js';
import { ACCENT } from './lib/tool.js';
import TodayTab from './tabs/TodayTab.jsx';
import LibraryTab from './tabs/LibraryTab.jsx';
import BuildTab from './tabs/BuildTab.jsx';
import QuizTab from './tabs/QuizTab.jsx';
import WeakTab from './tabs/WeakTab.jsx';
import MasteredTab from './tabs/MasteredTab.jsx';
import SettingsTab from './tabs/SettingsTab.jsx';

// Practice state keys. The chord library uses the same `fct_` prefix (see
// lib/library.js), which is what lets one ProgressBackup file carry both.
const K_SRS = PREFIX + 'srs';
const K_HIST = PREFIX + 'hist';
const K_DEGH = PREFIX + 'degh';
const K_MASTERED = PREFIX + 'mastered';
// When each chord was mastered, id → 'YYYY-MM-DD'. Kept beside fct_mastered
// rather than folded into it: that key is a plain id list read by everything
// that asks "is this mastered", and widening it would touch all of them. Dates
// are additive and optional — chords mastered before this existed simply have
// none, and the Mastered tab renders them without a date rather than guessing.
const K_MASTERED_AT = PREFIX + 'mastered_at';
const K_LAUNCHES = PREFIX + 'launches';
const K_HINT10 = PREFIX + 'audio_hint_launch';
const K_HINT20 = PREFIX + 'audio_hint_launch20';

// Anything the on-screen keyboard opens for. <select> is included because iOS
// shows a picker wheel that covers the page the same way.
const isFormField = el => !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);

const read = (k, fallback) => { try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

const TABS = [
  { id: 'daily', label: 'Today', icon: '🌅' },
  { id: 'library', label: 'Library', icon: '📚' },
  { id: 'build', label: 'Build', icon: '✏️' },
  { id: 'quiz', label: 'Quiz', icon: '🎯' },
  { id: 'weak', label: 'Weak', icon: '💪' },
  // Weak and Mastered are the two ends of the same progress story, so they sit
  // together rather than either being buried next to Settings.
  { id: 'mastered', label: 'Mastered', icon: '🏆' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function App() {
  const { chords, loaded: chordsLoaded, dropped } = useChords();
  const [tab, setTab] = useState('daily');
  const [showDeg, setShowDeg] = useState(false);
  const [srs, setSrs] = useState({});
  const [hist, setHist] = useState([]);
  const [degHist, setDegHist] = useState([]);
  const [mastered, setMastered] = useState(() => new Set());
  const [masteredAt, setMasteredAt] = useState({});
  const [showAudioHint, setShowAudioHint] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [hidDropped, setHidDropped] = useState(false);

  const scrollRef = useRef(null);
  // Refs so the async callbacks below always see fresh values without taking
  // them as dependencies — that keeps the callbacks stable, which is what lets
  // TodayTab stay memo'd across a grade.
  const srsRef = useRef(srs); srsRef.current = srs;
  const histRef = useRef(hist); histRef.current = hist;
  const degHistRef = useRef(degHist); degHistRef.current = degHist;
  const masteredRef = useRef(mastered); masteredRef.current = mastered;
  const masteredAtRef = useRef(masteredAt); masteredAtRef.current = masteredAt;

  // ── Load practice state ────────────────────────────────────────────────
  useEffect(() => {
    setSrs(read(K_SRS, {}));
    setHist(read(K_HIST, []));
    setDegHist(read(K_DEGH, []));
    setMastered(new Set(read(K_MASTERED, [])));
    setMasteredAt(read(K_MASTERED_AT, {}));
    setLoaded(true);
  }, []);

  // ── Launch counter (drives how long a dismissed audio hint stays away) ──
  useEffect(() => {
    const n = read(K_LAUNCHES, 0);
    write(K_LAUNCHES, n + 1);
  }, []);

  // ── Audio hint: old iOS only ───────────────────────────────────────────
  // Registering here (rather than inside a fixed-position component) means the
  // callback triggers an ordinary in-tree state update — no coordinate or paint
  // issues. On iOS 16.4+, audioSession 'playback' already bypasses the silent
  // switch, so "unmute your ringtone" would be wrong advice.
  useEffect(() => {
    if (!/iphone|ipad|ipod/i.test(navigator.userAgent)) return;
    if (navigator.audioSession) return;
    const launches = read(K_LAUNCHES, 0);
    const sup10 = read(K_HINT10, 0);
    const sup20 = read(K_HINT20, 0);
    if (Math.max(sup10, sup20) >= launches) return;
    if (firstPlayFired()) { setShowAudioHint(true); return; }
    registerFirstPlay(() => setShowAudioHint(true));
    return () => registerFirstPlay(null);
  }, []);

  // ── Page chrome ────────────────────────────────────────────────────────
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}
      html,body{height:100%;overflow:hidden;background:#0f0e17;}
      button,a,label,[role=button]{touch-action:manipulation;-webkit-user-select:none;user-select:none;}
      input,textarea,select{font-size:16px!important;}
      svg{user-select:none;-webkit-user-select:none;pointer-events:none;}
      svg [onclick],svg [style*='cursor']{pointer-events:auto;}
      :root{--sat:env(safe-area-inset-top);--sab:env(safe-area-inset-bottom);}
      @keyframes fct-spin{to{transform:rotate(360deg);}}
      .fct-spin{display:inline-block;animation:fct-spin .8s linear infinite;}
    `;
    document.head.appendChild(style);

    const setMeta = (name, content) => { let m = document.querySelector(`meta[name="${name}"]`); if (!m) { m = document.createElement('meta'); m.name = name; document.head.appendChild(m); } m.content = content; };
    setMeta('theme-color', '#0f0e17');
    setMeta('viewport', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
    setMeta('apple-mobile-web-app-capable', 'yes');
    setMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    setMeta('apple-mobile-web-app-title', 'Fretworks');

    // Single PWA: reference the unified shell manifest (one manifest per origin)
    // rather than generating a competing per-app one.
    let mlink = document.querySelector('link[rel="manifest"]');
    if (!mlink) { mlink = document.createElement('link'); mlink.rel = 'manifest'; document.head.appendChild(mlink); }
    mlink.href = '/manifest.webmanifest';

    // ── iOS standalone scroll offset fix ─────────────────────────────────
    // In standalone PWA mode WebKit initialises window.scrollY to the
    // safe-area-inset-top value (~50px). Touch events fire at layout coords
    // while the screen renders the visual viewport scrolled down, so every tap
    // registers ~50px above where it visually appears. Pin the page at 0,0.
    window.scrollTo(0, 0);
    const lockScroll = () => {
      // …but stand down while a field is focused. With the keyboard up, iOS
      // scrolls the window to reveal the focused input, and pinning it back to
      // 0 is what left the caret hidden under the keyboard.
      if (isFormField(document.activeElement)) return;
      if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
    };
    window.addEventListener('scroll', lockScroll, { passive: true });

    return () => { document.head.removeChild(style); window.removeEventListener('scroll', lockScroll); };
  }, []);

  // ── Keep the focused field above the keyboard ──────────────────────────
  // The app is a fixed 100dvh column with its own scroll container, and dvh
  // does NOT shrink for the keyboard — so the bottom of the page sits under it.
  // Scrolling alone can't rescue a field down there: the container is already
  // at its maximum scrollTop, because nothing was added to scroll into. So do
  // two things, in order — pad the scroller by however much the keyboard
  // covers, which creates that room, then scroll the field into it.
  //
  // visualViewport is the only thing that reports the space actually left;
  // innerHeight and dvh both keep reporting the full screen.
  useEffect(() => {
    const vv = window.visualViewport;

    const overlap = () => (vv ? Math.max(0, window.innerHeight - (vv.offsetTop + vv.height)) : 0);

    const apply = () => {
      const scroller = scrollRef.current;
      if (!scroller) return;
      const inset = overlap();
      // Only pad while something is focused — otherwise a stray viewport
      // change would leave a gap under the content.
      const want = isFormField(document.activeElement) ? inset : 0;
      if (scroller.style.paddingBottom !== `${want}px`) scroller.style.paddingBottom = `${want}px`;

      const el = document.activeElement;
      if (!isFormField(el) || !scroller.contains(el)) return;
      const r = el.getBoundingClientRect();
      const visibleTop = vv ? vv.offsetTop : 0;
      const visibleBottom = visibleTop + (vv ? vv.height : window.innerHeight);
      const M = 16; // breathing room, so the field isn't flush against the keyboard
      if (r.bottom > visibleBottom - M) scroller.scrollTop += r.bottom - visibleBottom + M;
      else if (r.top < visibleTop + M) scroller.scrollTop -= visibleTop + M - r.top;
    };

    // The keyboard animates in, so an immediate measurement would still see the
    // pre-keyboard viewport. visualViewport's resize is the real signal; the
    // timeout covers focus moving between fields while it is already up.
    const onFocusIn = e => { if (isFormField(e.target)) setTimeout(apply, 300); };
    const onFocusOut = () => setTimeout(apply, 100);
    const onResize = () => requestAnimationFrame(apply);

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    vv?.addEventListener('resize', onResize);
    vv?.addEventListener('scroll', onResize);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      vv?.removeEventListener('resize', onResize);
      vv?.removeEventListener('scroll', onResize);
      if (scrollRef.current) scrollRef.current.style.paddingBottom = '';
    };
  }, []);

  // ── Persistence helpers ────────────────────────────────────────────────
  const saveSrs = d => { setSrs(d); write(K_SRS, d); };
  const saveHist = d => { setHist(d); write(K_HIST, d); };
  const saveDegHist = d => { setDegHist(d); write(K_DEGH, d); };
  const saveMastered = s => { setMastered(s); write(K_MASTERED, [...s]); };
  const saveMasteredAt = m => { setMasteredAt(m); write(K_MASTERED_AT, m); };

  const onToggleMastered = useCallback(id => {
    const s = new Set(masteredRef.current);
    const at = { ...masteredAtRef.current };
    // Un-mastering forgets the date too, so re-mastering later reads as a
    // fresh achievement rather than back-dating it to the first attempt.
    if (s.has(id)) { s.delete(id); delete at[id]; } else { s.add(id); at[id] = todayStr(); }
    saveMastered(s);
    saveMasteredAt(at);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChordQuizDone = useCallback(results => {
    const ns = { ...srsRef.current }, nh = [...histRef.current], td = todayStr();
    for (const r of results) { ns[r.id] = updateSRS(ns[r.id], r.correct); nh.push({ id: r.id, correct: r.correct, date: td }); }
    saveSrs(ns); saveHist(nh);
  }, []); // eslint-disable-line

  const onDegDone = useCallback(results => {
    saveDegHist([...degHistRef.current, ...results.map(r => ({ ...r, date: todayStr() }))]);
  }, []); // eslint-disable-line

  // Stable — reads fresh state through refs, so TodayTab's memo holds and the
  // card list doesn't reshuffle when a grade lands.
  const onMarkReviewed = useCallback(id => {
    saveSrs({ ...srsRef.current, [id]: updateSRS(srsRef.current[id], true) });
    saveHist([...histRef.current, { id, correct: true, date: todayStr() }]);
  }, []); // eslint-disable-line

  // Navigating away from Build discards the pending edit target, so coming back
  // later opens a fresh editor rather than reopening whatever was last edited.
  const goTab = id => { setTab(id); if (id !== 'build') setEditTarget(null); if (scrollRef.current) scrollRef.current.scrollTop = 0; };
  const goBuild = () => goTab('build');
  const editChord = chord => { setEditTarget(chord); goTab('build'); };

  if (!loaded || !chordsLoaded) return (
    <div style={{ background: '#0f0e17', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT, fontSize: '16px' }}>Loading…</div>
  );

  return (
    <div style={{ background: '#0f0e17', height: '100dvh', display: 'flex', flexDirection: 'column', color: '#fffffe', fontFamily: 'var(--font-body)', WebkitFontSmoothing: 'antialiased' }}>
      <FocusHeader>
        <button className={`fw-header-btn${showDeg ? ' is-on' : ''}`} onClick={() => setShowDeg(p => !p)}>
          {showDeg ? '✦ Degrees ON' : 'Scale Degrees'}
        </button>
      </FocusHeader>

      <TabBar toolKey="focus" accent={ACCENT} tabs={TABS} active={tab} onChange={goTab} />

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'none' }}>
        <div style={{ paddingBottom: 'max(32px,env(safe-area-inset-bottom))' }}>
          {dropped > 0 && !hidDropped && (
            <div style={{ margin: '12px', padding: '9px 12px', background: '#ff636318', border: '1px solid #ff636344', borderRadius: '9px', fontSize: '11px', color: '#ffb3b3', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ flex: 1 }}>{dropped} saved chord{dropped === 1 ? '' : 's'} failed validation and {dropped === 1 ? 'was' : 'were'} skipped. Restore from a backup in Settings if that looks wrong.</span>
              <button onClick={() => setHidDropped(true)} aria-label="Dismiss"
                style={{ background: 'transparent', border: 'none', color: '#ffb3b3', fontSize: '16px', cursor: 'pointer', lineHeight: 1, padding: '0 4px', minHeight: '28px', flexShrink: 0 }}>×</button>
            </div>
          )}
          {tab === 'daily' && <TodayTab chords={chords} srsData={srs} showDeg={showDeg} setShowDeg={setShowDeg} onMarkReviewed={onMarkReviewed} mastered={mastered} onToggleMastered={onToggleMastered} scrollRef={scrollRef} onGoBuild={goBuild} />}
          {tab === 'library' && <LibraryTab chords={chords} showDeg={showDeg} setShowDeg={setShowDeg} mastered={mastered} onToggleMastered={onToggleMastered} scrollRef={scrollRef} onGoBuild={goBuild} onEditChord={editChord} />}
          {tab === 'build' && <BuildTab key={editTarget ? editTarget.id : 'new'} editTarget={editTarget} />}
          {tab === 'quiz' && <QuizTab chords={chords} showDeg={showDeg} onChordQuizDone={onChordQuizDone} onDegDone={onDegDone} onGoBuild={goBuild} />}
          {tab === 'weak' && <WeakTab chords={chords} history={hist} degHist={degHist} srs={srs} showDeg={showDeg} onComplete={onChordQuizDone} onGoBuild={goBuild} />}
          {tab === 'mastered' && <MasteredTab chords={chords} mastered={mastered} masteredAt={masteredAt} showDeg={showDeg} setShowDeg={setShowDeg} onToggleMastered={onToggleMastered} scrollRef={scrollRef} onGoBuild={goBuild} onEditChord={editChord} />}
          {tab === 'settings' && <SettingsTab chords={chords} srs={srs} hist={hist} degHist={degHist} />}

          {showAudioHint && (
            <AudioHintPanel
              onDismiss10={() => { setShowAudioHint(false); write(K_HINT10, read(K_LAUNCHES, 0) + 10); }}
              onDismiss20={() => { setShowAudioHint(false); write(K_HINT20, read(K_LAUNCHES, 0) + 20); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
