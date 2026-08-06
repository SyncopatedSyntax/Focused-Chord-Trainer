import { useRef, useEffect } from 'react';

// Small shared UI primitives, lifted from Chord Trainer's editor/ui.jsx so the
// Build tab looks identical to the editor it came from. The `Step`/`code`
// helpers are not carried over — they existed only for the "How to publish"
// instructions, and here a saved chord is live immediately with nothing to
// publish.

// Toggle/pill button style. `on` highlights it in `color`.
export const btn = (on, color = '#4ecdc4') => ({
  padding: '5px 9px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
  border: `1px solid ${on ? color : '#2a2840'}`, background: on ? color + '22' : '#13121f',
  color: on ? color : '#888', minHeight: '32px', touchAction: 'manipulation',
});
export const panel = { background: '#13121f', border: '1px solid #2a2840', borderRadius: '11px', padding: '12px' };
export const labelCss = { fontSize: '10px', color: '#888', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' };

// Serialize an array as pretty JSON, one object per line. Matches the layout of
// Chord Trainer's data/chords.json exactly, so a library exported here can be
// dropped straight into that repo.
export const serializeArray = arr => '[\n' + arr.map(x => '  ' + JSON.stringify(x)).join(',\n') + '\n]\n';

// Labelled text input.
export function Field({ label, value, onChange, placeholder, mono }) {
  return (
    <div>
      <div style={labelCss}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', background: '#0f0e17', border: '1px solid #2a2840', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '13px', outline: 'none', fontFamily: mono ? 'monospace' : 'inherit' }} />
    </div>
  );
}

// Chord symbols need glyphs no phone keyboard offers — Δ, ø and ° are not on
// the iOS keyboard at all, and ♭/♯ are buried behind a long-press that yields
// the wrong characters. So the field carries its own keypad.
//
// Row one is those glyphs; row two is whole suffixes, which are typeable but
// tedious. Insertion respects the caret rather than appending, so a symbol can
// be built left to right (C → Δ → 9). Each chip cancels the pointerdown that
// would blur the input: without that, iOS dismisses the keyboard on every tap
// and the caret is lost.
const SYMBOL_GLYPHS = ['Δ', 'ø', '°', '♭', '♯', '+', '−'];
const SYMBOL_SUFFIXES = ['maj7', 'm7', '7', 'sus4', 'add9'];

export function SymbolField({ label, value, onChange, placeholder }) {
  const inputRef = useRef(null);
  const caretRef = useRef(null);

  // Restore the caret after React commits the new value; setting it inside the
  // click handler would be undone by the controlled re-render.
  useEffect(() => {
    if (caretRef.current != null && inputRef.current) {
      inputRef.current.setSelectionRange(caretRef.current, caretRef.current);
      caretRef.current = null;
    }
  });

  const insert = text => {
    const el = inputRef.current;
    const start = el && el.selectionStart != null ? el.selectionStart : value.length;
    const end = el && el.selectionEnd != null ? el.selectionEnd : value.length;
    onChange(value.slice(0, start) + text + value.slice(end));
    caretRef.current = start + text.length;
    if (el) el.focus();
  };

  const chip = (extra = {}) => ({
    padding: '6px 9px', borderRadius: '7px', cursor: 'pointer', fontWeight: 700,
    border: '1px solid #2a2840', background: '#0f0e17', color: '#cfcde0',
    minHeight: '36px', minWidth: '34px', touchAction: 'manipulation', ...extra,
  });

  return (
    <div>
      <div style={labelCss}>{label}</div>
      <input ref={inputRef} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', background: '#0f0e17', border: '1px solid #2a2840', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '13px', outline: 'none' }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
        {SYMBOL_GLYPHS.map(s => (
          <button key={s} type="button" onMouseDown={e => e.preventDefault()} onClick={() => insert(s)}
            style={chip({ fontSize: '15px', color: '#4ecdc4', borderColor: '#4ecdc444' })}>{s}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
        {SYMBOL_SUFFIXES.map(s => (
          <button key={s} type="button" onMouseDown={e => e.preventDefault()} onClick={() => insert(s)}
            style={chip({ fontSize: '12px' })}>{s}</button>
        ))}
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { onChange(''); caretRef.current = 0; inputRef.current?.focus(); }}
          style={chip({ fontSize: '12px', color: '#ff8f8f', borderColor: '#ff636344', marginLeft: 'auto' })}>clear</button>
      </div>
    </div>
  );
}

// Shared first-run / nothing-here card. The library starts empty, so every tab
// needs one of these rather than rendering a blank panel.
export function EmptyState({ icon, title, body, action, onAction }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', maxWidth: '360px', margin: '0 auto' }}>
      <div style={{ fontSize: '42px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>{title}</div>
      <div style={{ fontSize: '13px', color: '#999', lineHeight: 1.6, marginBottom: action ? '18px' : 0 }}>{body}</div>
      {action && (
        <button onClick={onAction} style={{ background: '#4ecdc4', color: '#111', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 900, cursor: 'pointer', minHeight: '44px', touchAction: 'manipulation' }}>
          {action}
        </button>
      )}
    </div>
  );
}
