import { useEffect, useMemo, useState } from 'react';
import { api, upload } from './api.js';
import { Icon } from './icons.jsx';
import { twemojiUrl } from './utils.jsx';
import { loadEmojiData } from './emojiData.js';

const PACKS = [[0, 'Смайлы', 90], [3, 'Животные', 60], [4, 'Еда', 60], [6, 'Активности', 40]];
const getRecent = () => { try { return JSON.parse(localStorage.getItem('recentStickers') || '[]'); } catch { return []; } };
const go = (id) => document.getElementById(id)?.scrollIntoView({ block: 'start' });

export function StickerPanel({ onSend }) {
  const [data, setData] = useState(null); const [q, setQ] = useState(''); const [mine, setMine] = useState([]); const [recent, setRecent] = useState(getRecent);
  useEffect(() => { loadEmojiData().then((d) => setData(d || [])); api('/stickers').then(setMine).catch(() => {}); }, []);
  const packs = useMemo(() => PACKS.map(([g, title, n]) => [g, title, (data || []).filter((e) => e.group === g).sort((a, b) => a.order - b.order).slice(0, n)]), [data]);
  const send = (url) => {
    onSend(url);
    setRecent((r) => { const x = [url, ...r.filter((u) => u !== url)].slice(0, 12); try { localStorage.setItem('recentStickers', JSON.stringify(x)); } catch {} return x; });
  };
  const add = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { const s = await api('/stickers', { url: await upload(f) }); setMine((m) => [s, ...m]); } catch (x) { alert(x.message); }
  };
  const del = async (id) => { await api('/stickers/' + id, {}, 'DELETE'); setMine((m) => m.filter((s) => s.id !== id)); };
  const needle = q.trim().toLowerCase();
  const found = needle ? (data || []).filter((e) => `${e.annotation} ${(e.tags || []).join(' ')}`.toLowerCase().includes(needle)).slice(0, 60) : null;
  const tile = (url, key, extra) => <button key={key} className="stk" onClick={() => send(url)}><img src={url} alt="" loading="lazy" draggable="false" />{extra}</button>;
  return (
    <div className="epane">
      <div className="etabs">
        <button className="ib" title="Недавние" onClick={() => go('stk-recent')}><Icon n="clock" size={20} /></button>
        <button className="ib" title="Мои стикеры" onClick={() => go('stk-mine')}><Icon n="user" size={20} /></button>
        {packs.map(([g, title, list]) => list[0] && <button key={g} className="ib" title={title} onClick={() => go('stk-' + g)}><img className="emo" src={twemojiUrl(list[0].emoji)} alt="" /></button>)}
      </div>
      <label className="sbox esearch"><Icon n="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск стикеров" /></label>
      <div className="ebody">
        {found ? <div className="sgrid">{found.map((e) => tile(twemojiUrl(e.emoji), e.emoji))}</div> : <>
          {recent.length > 0 && <div id="stk-recent"><h4>Недавние</h4><div className="sgrid">{recent.map((u) => tile(u, u))}</div></div>}
          <div id="stk-mine"><h4>Мои стикеры</h4>
            <div className="sgrid">
              <label className="stk add" title="Добавить свой стикер"><Icon n="plus" size={28} /><input type="file" hidden accept="image/png,image/webp,image/gif" onChange={add} /></label>
              {mine.map((s) => tile(s.url, 'm' + s.id, <span className="xdel" title="Удалить" onClick={(e) => { e.stopPropagation(); del(s.id); }}><Icon n="close" size={12} /></span>))}
            </div></div>
          {packs.map(([g, title, list]) => list.length > 0 && <div key={g} id={'stk-' + g}><h4>{title}</h4><div className="sgrid">{list.map((e) => tile(twemojiUrl(e.emoji), e.emoji))}</div></div>)}
          {!data && <div className="sub wrap">Загрузка…</div>}
        </>}
      </div>
    </div>);
}

export function GifPanel({ onSend }) {
  const [q, setQ] = useState(''); const [items, setItems] = useState([]); const [err, setErr] = useState(''); const [busy, setBusy] = useState(true);
  useEffect(() => {
    setBusy(true);
    const h = setTimeout(() => api('/gifs?q=' + encodeURIComponent(q.trim())).then((d) => { setItems(d); setErr(''); }).catch((e) => setErr(e.message)).finally(() => setBusy(false)), q ? 350 : 0);
    return () => clearTimeout(h);
  }, [q]);
  return (
    <div className="epane">
      <label className="sbox esearch gsearch"><Icon n="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск GIF" /></label>
      <div className="ebody">
        {err && <div className="sub wrap">{err}</div>}
        {!err && busy && <div className="sub wrap">Загрузка…</div>}
        {!err && !busy && !items.length && <div className="sub wrap">Ничего не найдено</div>}
        <div className="ggrid">{items.map((g) => <button key={g.id} className="gif" onClick={() => onSend(g.mp4)}><video src={g.mp4} autoPlay loop muted playsInline /></button>)}</div>
      </div>
    </div>);
}
