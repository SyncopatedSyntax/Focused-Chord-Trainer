// ── The chord editor ─────────────────────────────────────────────────────
// Ported from Chord Trainer's editor/Editor.jsx. The fretboard editor, root
// marking, live degree derivation, ambiguous-spelling dropdowns and live
// validation are all as they were — that machinery is the whole reason a chord
// can't be entered with a wrong note.
//
// What changed: there is no file to save. The upstream editor kept its own
// `chords` state, wrote data/chords.json through the File System Access API,
// and had a "How to publish" tab explaining the commit-and-redeploy loop. Here
// a saved chord goes straight into the shared library and is immediately
// schedulable and quizzable, so all of that is gone. Export/import remain, but
// as backup and interchange rather than as the publishing path.

import { useState, useMemo, useRef } from 'react';
import ChordDiagram from '../components/ChordDiagram.jsx';
import EditableFretboard, { FRET_WINDOW, MAX_WIN_START } from '../components/EditableFretboard.jsx';
import { playVoicing } from '../lib/audio.js';
import { useChords } from '../lib/ChordsContext.jsx';
import { exportChords, readChordsFile } from '../lib/library.js';
import {
  CATS, DC, OPEN_MIDI, DEGREE_ALTS,
  deriveDegrees, computeStartFret, validateVoicing,
} from '../data/theory.js';
import { btn, panel, labelCss, Field, SymbolField } from '../components/ui.jsx';
import { useIsNarrow } from '../lib/useIsNarrow.js';

const STRINGS = ['E (6th)', 'A (5th)', 'D (4th)', 'G (3rd)', 'B (2nd)', 'e (1st)'];
const CAT_KEYS = Object.keys(CATS);

// Open the fret window on the shape being edited rather than always at the
// nut, so loading a 9th-fret voicing shows it instead of six empty frets.
const windowFor = str => {
  const active = str.filter(f => f > 0);
  if (!active.length) return 1;
  return Math.max(1, Math.min(MAX_WIN_START, Math.min(...active)));
};

const slug = s => (s || '').replace(/[^a-z0-9]/gi, '').slice(0, 14) || 'chord';
const blankDraft = () => ({ id: '', name: '', sym: '', cat: CAT_KEYS[0], movable: false, label: '', str: [-1, -1, -1, -1, -1, -1], rootIdx: null, overrides: {} });

// Build the editor draft from an existing chord, preserving its exact degree
// spellings (e.g. #9, b13) as overrides where they differ from the default.
function draftFromChord(c) {
  const v = c.voicings[0];
  let rootIdx = v.deg.findIndex((d, i) => d === 'R' && v.str[i] >= 0);
  if (rootIdx < 0) rootIdx = null;
  const derived = deriveDegrees(v.str, rootIdx);
  const overrides = {};
  v.deg.forEach((d, i) => { if (d != null && v.str[i] >= 0 && d !== derived[i]) overrides[i] = d; });
  return { id: c.id, name: c.name, sym: c.sym, cat: c.cat, movable: !!c.movable, label: v.label || '', str: [...v.str], rootIdx, overrides };
}

// `editTarget` arrives when the user tapped Edit on a chord's detail view. App
// remounts this component (keyed on the target's id) whenever it changes, so
// the lazy initialisers below are enough to open the right draft.
export default function BuildTab({ editTarget }) {
  const { chords, add, update, remove, merge } = useChords();
  // Open straight into a draft rather than a form-less list: editing what the
  // user asked to edit, or a blank chord when there is nothing to browse yet
  // (an empty list beside an empty pane is a dead end on first run).
  const [draft, setDraft] = useState(() => (editTarget ? draftFromChord(editTarget) : chords.length === 0 ? blankDraft() : null));
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const importRef = useRef(null);
  const editingId = useRef(editTarget ? editTarget.id : null); // id being edited (null = adding)

  const narrow = useIsNarrow();
  // On a phone the list and the editor can't sit side by side, and stacking
  // them buries the form under a scroll of chords. So the two become views:
  // the editor takes the screen, with the list one tap away.
  const [showList, setShowList] = useState(false);
  // Which six frets the shape editor is showing. Held here, not in the
  // fretboard, so opening a different chord can aim it at that chord.
  const [winStart, setWinStart] = useState(() => (editTarget ? windowFor(editTarget.voicings[0].str) : 1));

  const flash = m => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  // ── Derived degree array for the current draft ──────────────────────────
  const finalDeg = useMemo(() => {
    if (!draft) return [];
    const derived = deriveDegrees(draft.str, draft.rootIdx);
    return derived.map((d, i) => (draft.overrides[i] != null && draft.str[i] >= 0 ? draft.overrides[i] : d));
  }, [draft]);

  const draftVoicing = useMemo(() => {
    if (!draft) return null;
    return { str: draft.str, deg: finalDeg, sf: computeStartFret(draft.str), label: draft.label };
  }, [draft, finalDeg]);

  // Strings whose interval has more than one legitimate spelling. Previously
  // every string carried a degree cell that was usually just a read-only chip;
  // degrees now render inside the dots, so only the genuinely ambiguous ones
  // still need a control.
  const spellingChoices = useMemo(() => {
    if (!draft || draft.rootIdx == null || draft.str[draft.rootIdx] < 0) return [];
    const rootPc = (OPEN_MIDI[draft.rootIdx] + draft.str[draft.rootIdx]) % 12;
    const out = [];
    draft.str.forEach((fret, i) => {
      if (fret < 0 || i === draft.rootIdx) return;
      const interval = (((OPEN_MIDI[i] + fret) % 12 - rootPc) % 12 + 12) % 12;
      const opts = DEGREE_ALTS[interval];
      if (opts && opts.length > 1) out.push({ i, opts });
    });
    return out;
  }, [draft]);

  const draftErrors = useMemo(() => {
    if (!draft) return [];
    const e = [];
    if (!draft.id.trim()) e.push('id is required');
    else if (chords.some(c => c.id === draft.id && c.id !== editingId.current)) e.push(`id "${draft.id}" already exists`);
    if (!draft.name.trim()) e.push('name is required');
    if (!draft.sym.trim()) e.push('symbol is required');
    if (draft.rootIdx == null) e.push('mark a root (R) on one string');
    if (draftVoicing) e.push(...validateVoicing(draftVoicing).errors);
    return e;
  }, [draft, draftVoicing, chords]);

  // ── Draft actions ───────────────────────────────────────────────────────
  // Each of these opens the editor, so on narrow they also leave the list.
  const startNew = () => { editingId.current = null; setDraft(blankDraft()); setShowList(false); setWinStart(1); };
  const startEdit = c => { editingId.current = c.id; setDraft(draftFromChord(c)); setShowList(false); setWinStart(windowFor(c.voicings[0].str)); };
  const startDuplicate = c => { editingId.current = null; const d = draftFromChord(c); d.id = ''; d.name = c.name + ' copy'; setDraft(d); setShowList(false); setWinStart(windowFor(c.voicings[0].str)); };
  const cancel = () => { editingId.current = null; setDraft(null); setShowList(false); };

  const setStr = (i, fret) => setDraft(d => {
    const str = [...d.str]; str[i] = fret;
    // Changing a string's fret changes its interval, so any prior spelling
    // override for that string no longer applies — reset it to the default.
    const overrides = { ...d.overrides }; delete overrides[i];
    let rootIdx = d.rootIdx;
    if (fret < 0 && rootIdx === i) rootIdx = null; // muting the root clears it
    return { ...d, str, overrides, rootIdx };
  });
  // Moving the root re-intervals every string, so clear all overrides.
  const setRoot = i => setDraft(d => (d.str[i] < 0 ? d : { ...d, rootIdx: i, overrides: {} }));
  const setOverride = (i, deg) => setDraft(d => ({ ...d, overrides: { ...d.overrides, [i]: deg } }));
  const patch = p => setDraft(d => ({ ...d, ...p }));

  const save = () => {
    if (draftErrors.length) { flash('Fix the issues below before saving'); return; }
    const chord = {
      id: draft.id.trim(), name: draft.name.trim(), sym: draft.sym.trim(), cat: draft.cat,
      ...(draft.movable ? { movable: true } : {}),
      voicings: [{ label: draft.label.trim(), str: draft.str, deg: finalDeg, sf: computeStartFret(draft.str) }],
    };
    const wasEditing = editingId.current;
    if (wasEditing) update(wasEditing, chord); else add(chord);
    editingId.current = null;
    setDraft(null);
    setShowList(false);
    flash(wasEditing ? `Updated ${chord.name} ✓` : `Added ${chord.name} — it's in your practice rotation now ✓`);
  };

  const del = c => {
    if (!window.confirm(`Delete "${c.name}"? Its practice history stays, but it stops being scheduled.`)) return;
    remove(c.id);
    if (editingId.current === c.id) cancel();
    flash(`Deleted ${c.name}`);
  };

  const importFile = async e => {
    const file = e.target.files[0]; if (!file) return;
    e.target.value = '';
    try {
      const { chords: incoming, errors } = await readChordsFile(file);
      if (errors.length && !window.confirm(`That file has ${errors.length} validation issue(s). Import anyway? Chords that don't check out will be skipped when the library loads.\n\n${errors.slice(0, 6).join('\n')}`)) return;
      const renamed = merge(incoming);
      flash(`Imported ${incoming.length} chord(s)${renamed ? ` · ${renamed} id(s) renamed to avoid collisions` : ''}`);
    } catch (err) { flash('Import failed: ' + err.message); }
  };

  // ── List filtering ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = catFilter === 'all' ? chords : chords.filter(c => c.cat === catFilter);
    const q = search.trim().toLowerCase();
    if (q) r = r.filter(c => c.name.toLowerCase().includes(q) || c.sym.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
    return r;
  }, [chords, catFilter, search]);

  // On a phone the two panes become two views; on a wide screen both show.
  const listVisible = !narrow || !draft || showList;
  const editorVisible = !!draft && (!narrow || !showList);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: narrow ? '12px 10px' : '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div style={{ fontSize: narrow ? '15px' : '17px', fontWeight: 900, color: '#fff' }}>✏️ Build your library</div>
        <span style={{ fontSize: '11px', color: '#888' }}>{chords.length} chord{chords.length === 1 ? '' : 's'}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button onClick={() => exportChords(chords)} disabled={chords.length === 0} style={{ ...btn(false, '#a29bfe'), opacity: chords.length ? 1 : 0.4 }}>{narrow ? 'Export' : 'Export chords.json'}</button>
          <button onClick={() => importRef.current?.click()} style={btn(false, '#4ecdc4')}>Import</button>
          <input ref={importRef} type="file" accept=".json" onChange={importFile} style={{ display: 'none' }} />
        </div>
      </div>
      {msg && <div style={{ background: '#4ecdc418', border: '1px solid #4ecdc444', color: '#4ecdc4', borderRadius: '9px', padding: '8px 12px', marginBottom: '12px', fontSize: '12px', fontWeight: 600 }}>{msg}</div>}
      {!narrow && (
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '12px', lineHeight: 1.5 }}>
          Chords save to this device the moment you add them — nothing to publish. Scale degrees derive from the shape you build, so a wrong note can't be saved with a right-sounding label. Back the library up from <b>Settings</b>, or export it as a <code style={{ fontFamily: 'monospace', color: '#4ecdc4' }}>chords.json</code> that Chord Trainer can read.
        </div>
      )}

      {/* Switch back to the list without discarding the draft. */}
      {narrow && editorVisible && (
        <button onClick={() => setShowList(true)} style={{ ...btn(false), width: '100%', marginBottom: '10px', padding: '9px' }}>
          ☰ Browse chords ({chords.length})
        </button>
      )}

      {/* minmax(0, 1fr), not 1fr: a 1fr track's automatic minimum is min-content,
          so the editor column would grow to fit the widest fret strip and push
          the layout past the viewport instead of letting the strip scroll. */}
      <div style={{ display: 'grid', gridTemplateColumns: !narrow && draft ? 'minmax(240px, 300px) minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: '14px', alignItems: 'start' }}>
        {/* List */}
        <div style={{ ...panel, display: listVisible ? 'block' : 'none' }}>
          {narrow && draft && showList && (
            <button onClick={() => setShowList(false)} style={{ ...btn(false, '#4ecdc4'), width: '100%', marginBottom: '8px', padding: '9px' }}>
              ← Back to {editingId.current ? 'editing' : 'your new chord'}
            </button>
          )}
          <button onClick={startNew} style={{ ...btn(true), width: '100%', marginBottom: '10px', padding: '9px' }}>+ New chord</button>
          {chords.length > 0 && (<>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ width: '100%', background: '#0f0e17', border: '1px solid #2a2840', borderRadius: '8px', padding: '7px 10px', color: '#fff', fontSize: '13px', marginBottom: '8px', outline: 'none' }} />
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: '100%', background: '#0f0e17', border: '1px solid #2a2840', borderRadius: '8px', padding: '7px 10px', color: '#fff', fontSize: '12px', marginBottom: '10px' }}>
              <option value="all">All categories ({chords.length})</option>
              {CAT_KEYS.map(k => <option key={k} value={k}>{CATS[k].label} ({chords.filter(c => c.cat === k).length})</option>)}
            </select>
          </>)}
          <div style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {filtered.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: editingId.current === c.id ? '#1e1c32' : '#0f0e17', border: `1px solid ${editingId.current === c.id ? '#4ecdc4' : '#2a2840'}`, borderRadius: '8px', padding: '5px 7px' }}>
                <div onClick={() => startEdit(c)} style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1, minWidth: 0, cursor: 'pointer' }}>
                  <ChordDiagram v={c.voicings[0]} showDeg size={0.5} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                    <div style={{ fontSize: '9px', color: CATS[c.cat]?.color || '#888' }}>{c.sym} · {c.id}</div>
                  </div>
                </div>
                <button title="Duplicate" onClick={() => startDuplicate(c)} style={{ ...btn(false), minHeight: '26px', padding: '3px 7px', fontSize: '11px' }}>⧉</button>
                <button title="Delete" onClick={() => del(c)} style={{ ...btn(false, '#ff6363'), minHeight: '26px', padding: '3px 7px', fontSize: '11px' }}>✕</button>
              </div>
            ))}
            {chords.length === 0 && <div style={{ color: '#666', fontSize: '12px', textAlign: 'center', padding: '20px', lineHeight: 1.6 }}>No chords yet.<br />{narrow ? 'Tap + New chord to start.' : 'Build one on the right →'}</div>}
            {chords.length > 0 && filtered.length === 0 && <div style={{ color: '#666', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No chords match.</div>}
          </div>
        </div>

        {/* Editor form */}
        {editorVisible && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Shape first. It used to sit below the metadata, which put the
                diagram off-screen exactly when you were entering frets — the
                whole reason this is now a direct-manipulation editor. */}
            <div style={panel}>
              <div style={labelCss}>Shape — tap the grid to place notes</div>
              <div style={{ background: '#0f0e17', borderRadius: '10px', padding: '10px 6px 6px', border: '1px solid #2a2840' }}>
                <EditableFretboard
                  str={draft.str} deg={finalDeg} rootIdx={draft.rootIdx} winStart={winStart}
                  maxWidth={narrow ? 360 : 320}
                  onCell={(i, f) => setStr(i, draft.str[i] === f ? -1 : f)}
                  onMarker={i => setStr(i, draft.str[i] === 0 ? -1 : 0)}
                  onRoot={setRoot}
                />
              </div>

              {/* Fret window */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '8px' }}>
                <button onClick={() => setWinStart(w => Math.max(1, w - 1))} disabled={winStart <= 1}
                  style={{ ...btn(false), opacity: winStart <= 1 ? 0.3 : 1, minWidth: '44px', minHeight: '38px' }}>▲</button>
                <div style={{ fontSize: '11px', color: '#bbb', fontWeight: 700, minWidth: '92px', textAlign: 'center', fontFamily: 'monospace' }}>
                  frets {winStart}–{winStart + FRET_WINDOW - 1}
                </div>
                <button onClick={() => setWinStart(w => Math.min(MAX_WIN_START, w + 1))} disabled={winStart >= MAX_WIN_START}
                  style={{ ...btn(false), opacity: winStart >= MAX_WIN_START ? 0.3 : 1, minWidth: '44px', minHeight: '38px' }}>▼</button>
              </div>

              <div style={{ display: 'flex', gap: '5px', marginTop: '10px', justifyContent: 'center' }}>
                <button onClick={() => playVoicing(draftVoicing, 'strum')} style={btn(false)}>♬ Strum</button>
                <button onClick={() => playVoicing(draftVoicing, 'arp')} style={btn(false)}>♩ Arp</button>
              </div>

              {/* Only the ambiguous strings need a spelling control. */}
              {spellingChoices.length > 0 && (
                <div style={{ marginTop: '10px', borderTop: '1px solid #1a1928', paddingTop: '8px' }}>
                  <div style={{ ...labelCss, marginBottom: '5px' }}>Spelling</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {spellingChoices.map(({ i, opts }) => (
                      <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#bbb' }}>
                        {STRINGS[i]}
                        <select value={finalDeg[i]} onChange={e => setOverride(i, e.target.value)}
                          style={{ background: (DC[finalDeg[i]] || '#888') + '22', color: DC[finalDeg[i]] || '#fff', border: `1px solid ${DC[finalDeg[i]] || '#2a2840'}`, borderRadius: '7px', padding: '5px 6px', fontSize: '12px', fontWeight: 700 }}>
                          {opts.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ fontSize: '10px', color: '#666', marginTop: '9px', lineHeight: 1.5 }}>
                Tap a square to fret that string (tap it again to mute). The ✕/○ above a string opens or mutes it, and <b style={{ color: '#ff8f8f' }}>R</b> marks the root. Degrees derive from the shape — a wrong note can't be saved with a right-sounding label.
              </div>
            </div>

            <div style={panel}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {/* Metadata fields */}
                <div style={{ flex: 1, minWidth: narrow ? '100%' : '240px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Field label="Name" value={draft.name} onChange={v => patch(editingId.current || draft.id ? { name: v } : { name: v, id: slug(v) })} placeholder="e.g. C Major" />
                  <SymbolField label="Symbol" value={draft.sym} onChange={v => patch({ sym: v })} placeholder="e.g. C, m7, CΔ9" />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={labelCss}>Category</div>
                      <select value={draft.cat} onChange={e => patch({ cat: e.target.value })} style={{ width: '100%', background: '#0f0e17', border: '1px solid #2a2840', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '13px' }}>
                        {CAT_KEYS.map(k => <option key={k} value={k}>{CATS[k].label}</option>)}
                      </select>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#bbb', alignSelf: 'flex-end', padding: '8px 0' }}>
                      <input type="checkbox" checked={draft.movable} onChange={e => patch({ movable: e.target.checked })} /> movable
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}><Field label="id (unique)" value={draft.id} onChange={v => patch({ id: v })} placeholder={slug(draft.name)} mono /></div>
                    <button onClick={() => patch({ id: slug(draft.name) })} style={btn(false)}>Auto-id</button>
                  </div>
                  <Field label="Voicing label (optional)" value={draft.label} onChange={v => patch({ label: v })} placeholder="e.g. Open, 6th-str root" />
                  <div style={{ fontSize: '11px', color: '#888' }}>Start fret (auto): <b style={{ color: '#4ecdc4' }}>{computeStartFret(draft.str)}</b></div>
                </div>
              </div>
            </div>

            {/* Errors + actions */}
            {draftErrors.length > 0 && (
              <div style={{ ...panel, border: '1px solid #ff636355' }}>
                <div style={{ fontSize: '11px', color: '#ff6363', fontWeight: 700, marginBottom: '5px' }}>{draftErrors.length} issue(s)</div>
                {draftErrors.map((e, i) => <div key={i} style={{ fontSize: '11px', color: '#ffb3b3' }}>• {e}</div>)}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={save} disabled={draftErrors.length > 0} style={{ ...btn(true, '#00b894'), opacity: draftErrors.length ? 0.4 : 1, padding: '10px 20px', minHeight: narrow ? '46px' : undefined, flex: narrow ? 1 : 'none', cursor: draftErrors.length ? 'not-allowed' : 'pointer' }}>
                {editingId.current ? 'Update chord' : 'Add chord'}
              </button>
              <button onClick={cancel} style={{ ...btn(false), padding: '10px 18px', minHeight: narrow ? '46px' : undefined }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
