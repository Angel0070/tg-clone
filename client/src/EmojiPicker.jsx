import { useEffect, useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import { Emo, EMOJI } from './utils.jsx';

// группы emojibase: 0 смайлы, 1 люди (объединяем), 2 тона кожи (пропускаем), 3 животные, 4 еда, 5 места, 6 активности, 7 предметы, 8 символы, 9 флаги
const CATS = [['recent', 'Недавние', 'clock'], [0, 'Смайлы и люди', 'smile'], [3, 'Животные и природа', 'paw'], [4, 'Еда и напитки', 'apple'],
  [5, 'Путешествия и места', 'car'], [6, 'Активности', 'ball'], [7, 'Предметы', 'bulb'], [8, 'Символы', 'hash'], [9, 'Флаги', 'flag']];
let cache = null;
const load = () => (cache ||= fetch('https://cdn.jsdelivr.net/npm/emoji-picker-element-data@1/ru/cldr/data.json')
  .then((r) => r.json()).then((d) => { if (!Array.isArray(d) || !d[0]?.emoji) throw new Error('bad data'); return d; }).catch(() => null));

export default function EmojiPicker({ onPick, onBackspace }) {
  const [data, setData] = useState(null); const [q, setQ] = useState(''); const [offline, setOffline] = useState(false);
  const [recent, setRecent] = useState(() => { try { return JSON.parse(localStorage.getItem('recentEmoji') || '[]'); } catch { return []; } });
  useEffect(() => {
    load().then((d) => { if (d) setData(d); else { setOffline(true); setData(EMOJI.map((emoji, i) => ({ emoji, annotation: '', tags: [], group: 0, order: i }))); } });
  }, []);
  const groups = useMemo(() => {
    const g = {};
    (data || []).forEach((e) => { if (e.group === 2) return; (g[e.group === 1 ? 0 : e.group] ||= []).push(e); });
    Object.values(g).forEach((a) => a.sort((x, y) => x.order - y.order));
    return g;
  }, [data]);
  const pick = (e) => {
    onPick(e);
    setRecent((r) => { const n = [e, ...r.filter((x) => x !== e)].slice(0, 16); try { localStorage.setItem('recentEmoji', JSON.stringify(n)); } catch {} return n; });
  };
  const needle = q.trim().toLowerCase();
  const found = needle ? (data || []).filter((e) => `${e.annotation} ${(e.tags || []).join(' ')}`.toLowerCase().includes(needle)).slice(0, 160) : null;
  const sections = found ? [['found', found.length ? 'Результаты' : 'Ничего не найдено', found]]
    : CATS.map(([k, title]) => [k, title, k === 'recent' ? recent.map((emoji) => ({ emoji })) : groups[k] || []]).filter(([, , list]) => list.length);
  return (
    <div className="epicker" onClick={(e) => e.stopPropagation()}>
      <div className="etabs">{CATS.map(([k, title, icon]) => (
        <button key={k} className="ib" title={title} onClick={() => { setQ(''); setTimeout(() => document.getElementById('emo-' + k)?.scrollIntoView({ block: 'start' }), 0); }}><Icon n={icon} size={20} /></button>))}</div>
      <label className="sbox esearch"><Icon n="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск эмодзи" /></label>
      <div className="ebody">
        {offline && <div className="sub" style={{ padding: 8 }}>Полный набор эмодзи не загрузился, проверьте интернет.</div>}
        {sections.map(([k, title, list]) => (
          <div key={k} id={'emo-' + k}><h4>{title}</h4>
            <div className="egrid">{list.map((e) => <button key={e.emoji} className="em" title={e.annotation} onClick={() => pick(e.emoji)}><Emo e={e.emoji} /></button>)}</div></div>))}
        {!data && <div className="sub" style={{ padding: 12 }}>Загрузка…</div>}
      </div>
      <div className="ebar"><span className="grow" /><button className="ib" title="Стереть" onClick={onBackspace}><Icon n="backspace" /></button></div>
    </div>);
}
