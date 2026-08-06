import { ACCENT } from '../lib/tool.js';

// Shown only on iOS builds too old for navigator.audioSession, where the
// looping-silent-audio promotion (lib/audio.js layer 2) is best-effort and the
// hardware ringer switch can still mute Web Audio. On iOS 16.4+ layer 1 handles
// it properly and this would be wrong advice, so App gates it accordingly.
export default function AudioHintPanel({ onDismiss10, onDismiss20 }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 'max(16px,env(safe-area-inset-bottom))',
      left: '12px', right: '12px',
      zIndex: 9998,
      background: '#242235',
      borderRadius: '18px',
      border: '1px solid #2a2840',
      boxShadow: '0 8px 40px #000000aa',
      padding: '14px 14px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}>🔔</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>No sound?</div>
          <div style={{ fontSize: '11px', color: '#888', lineHeight: '1.4' }}>Unmute your ringtone to hear chord audio.</div>
        </div>
        <button onClick={onDismiss10}
          style={{
            background: 'transparent', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer',
            padding: '0 4px', lineHeight: 1, minWidth: '36px', minHeight: '44px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
          }}>×</button>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onDismiss10}
          style={{
            flex: 1, background: ACCENT, color: '#111', border: 'none', padding: '10px',
            borderRadius: '11px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', minHeight: '44px',
            touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
          }}>
          Got it
        </button>
        <button onClick={onDismiss20}
          style={{
            flex: 1, background: 'transparent', color: '#666', border: '1px solid #2a2840',
            padding: '10px', borderRadius: '11px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', minHeight: '44px',
            touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
          }}>
          Don't show again
        </button>
      </div>
    </div>
  );
}
