import { useState } from 'react';
import { playVoicing } from '../lib/audio.js';
import { ACCENT } from '../lib/tool.js';

// Strum / arpeggio buttons for a voicing. Lifted from Chord Trainer, including
// the event-stopping below, which is load-bearing.
export default function PlayButtons({ v, size, stack }) {
  const [active, setActive] = useState(null);
  const nc = v.str.filter(f => f >= 0).length;
  const play = mode => { setActive(mode); playVoicing(v, mode); setTimeout(() => setActive(null), mode === 'arp' ? nc * 110 + 800 : 600); };
  const sm = size === 'sm';
  const style = mode => ({ background: active === mode ? ACCENT + '15' : 'transparent', border: `1px solid ${active === mode ? ACCENT : '#2a2840'}`, color: active === mode ? ACCENT : '#888', borderRadius: '7px', padding: sm ? '4px 9px' : '7px 15px', fontSize: sm ? '11px' : '12px', cursor: 'pointer', fontWeight: 600, transition: 'all .15s', minHeight: sm ? '30px' : '38px', width: stack ? '100%' : 'auto' });

  // stopPropagation on both onClick AND onTouchStart: Safari synthesises a click
  // from touchend and bubbles it through the DOM, reaching any parent tappable
  // div (e.g. the chord-detail opener). Firefox Mobile consumes the touch at the
  // button. Blocking both means playing never opens the detail view anywhere.
  const stop = e => e.stopPropagation();
  return (
    <div
      style={{ display: 'flex', flexDirection: stack ? 'column' : 'row', gap: '5px', alignItems: 'stretch' }}
      onClick={stop}
      onTouchStart={stop}
    >
      <button onClick={e => { stop(e); play('arp'); }} style={style('arp')}>♩ Arp</button>
      <button onClick={e => { stop(e); play('strum'); }} style={style('strum')}>♬ Strum</button>
    </div>
  );
}
