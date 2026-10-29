import { useMemo, useRef, useState } from 'react';
import { Icon } from './icons.jsx';
import { fmt, ext, size, Linkify, isBigEmoji } from './utils.jsx';

/* ---------- Голосовое сообщение ---------- */
export function Voice({ m }) {
  const a = useRef(null); const [playing, setPlaying] = useState(false); const [p, setP] = useState(0);
  const bars = useMemo(() => (m.waveform ? m.waveform.split(',').map(Number)
    : Array.from({ length: 40 }, (_, i) => 6 + ((m.id * 31 + i * 17) % 18))), [m.id, m.waveform]);
  const total = m.duration || 1;
  const toggle = (e) => {
    e.stopPropagation(); const el = a.current;
    if (el.paused) { document.querySelectorAll('audio').forEach((x) => x !== el && x.pause()); el.play(); } else el.pause();
  };
  const seek = (e) => {
    e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect();
    a.current.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * total;
  };
  return (
    <div className="voice" onClick={(e) => e.stopPropagation()}>
      <audio ref={a} src={m.file_url} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setP(0); }} onTimeUpdate={(e) => setP(Math.min(1, e.target.currentTime / total))} />
      <button className="vplay" onClick={toggle}><Icon n={playing ? 'pause' : 'play'} size={22} /></button>
      <div className="vmain">
        <div className="wave" onClick={seek}>{bars.map((h, i) => <i key={i} className={i / bars.length < p ? 'on' : ''} style={{ height: h }} />)}</div>
        <span className="vdur">{fmt(playing ? Math.round(p * total) : m.duration || 0)}</span>
      </div>
    </div>);
}

export function Body({ m, onView }) {
  const stop = (e) => e.stopPropagation();
  return (<>
    {m.kind === 'voice' && <Voice m={m} />}
    {m.kind === 'sticker' && <img className="stk-img" src={m.file_url} alt="" draggable="false" />}
    {m.kind === 'gif' && <video className="pic" src={m.file_url} autoPlay loop muted playsInline onClick={stop} />}
    {m.kind === 'audio' && <div className="music" onClick={stop}><span className="fi blue"><Icon n="music" size={22} /></span><div><b>{m.file_name}</b><audio controls preload="metadata" src={m.file_url} /></div></div>}
    {m.kind === 'image' && <img className="pic" src={m.file_url} alt="" onClick={(e) => { stop(e); onView(m); }} />}
    {m.kind === 'video' && <video className="pic" controls preload="metadata" src={m.file_url} onClick={stop} />}
    {m.kind === 'file' && <a className="file" href={m.file_url} download={m.file_name} onClick={stop}>
      <span className="fi">{ext(m.file_name)}</span><span><b>{m.file_name}</b><small>{size(m.file_size)}</small></span></a>}
    {m.text && <div className={'txt' + (isBigEmoji(m.text) ? ' bigemo' : '')}><Linkify text={m.text} /></div>}
  </>);
}

