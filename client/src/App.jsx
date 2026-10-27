import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api, getToken, upload, uploadFile } from './api.js';

/* ---------- Иконки (нарисованы SVG-путями) ---------- */
const FILL = { fill: 'currentColor', stroke: 'none' };
const ICONS = {
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.5-4.5" /></>,
  group: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M16 11h6" /></>,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  back: <path d="M15 18l-6-6 6-6" />,
  clip: <path d="M21.4 11l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />,
  smile: <><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></>,
  mic: <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" /></>,
  send: <><path d="M3 11.5L20.5 4 14 20l-3.2-6.3L3 11.5z" /><path d="M10.8 13.7L20.5 4" /></>,
  check: <path d="M20 6L9 17l-5-5" />,
  dcheck: <><path d="M2 12.5L7 17.5 16.5 7" /><path d="M11 15l2.5 2.5L22 7" /></>,
  reply: <><path d="M9 14L4 9l5-5" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></>,
  copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  edit: <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
  trash: <><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" /></>,
  play: <path d="M7 4.5v15l12-7.5z" {...FILL} />,
  pause: <><rect x="6" y="4.5" width="4" height="15" rx="1.2" {...FILL} /><rect x="14" y="4.5" width="4" height="15" rx="1.2" {...FILL} /></>,
  camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>,
};
const Icon = ({ n, size = 22 }) => (
  <svg className="ic" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONS[n]}</svg>);

/* ---------- Утилиты ---------- */
const EMOJI = '😀 😃 😄 😁 😆 😅 😂 🤣 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤔 😐 😏 😒 🙄 😬 😌 😔 😴 😷 🤒 🥵 🥶 🤯 🤠 😎 🤓 🧐 😕 😟 🙁 😮 😲 😳 🥺 😢 😭 😱 😖 😞 😩 😫 😤 😡 🤬 😈 💀 💩 🤡 👻 👽 🤖 👍 👎 👌 🤞 🤟 🤘 👋 🙏 💪 👏 🙌 🤝 ❤️ 🧡 💛 💚 💙 💜 🖤 💔 🔥 ✨ ⭐ 🎉 🎂 🎁 🍕 🍔 🍟 🍺 ☕ 🐶 🐱 🦊 🐻 🐼 🐸 🐵 🙈'.split(' ');
const fmt = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
const hm = (t) => new Date(t).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
const dayLabel = (t) => {
  const d = new Date(t), n = new Date();
  const diff = Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
  return diff === 0 ? 'Сегодня' : diff === 1 ? 'Вчера' : d.toLocaleDateString('ru', { day: 'numeric', month: 'long' });
};
const listTime = (t) => (!t ? '' : dayLabel(t) === 'Сегодня' ? hm(t) : new Date(t).toLocaleDateString('ru', { day: 'numeric', month: 'short' }));
const seen = (p) => {
  if (!p) return '';
  if (p.online) return 'в сети';
  if (!p.lastSeen) return 'был(а) давно';
  if (Date.now() - p.lastSeen < 60000) return 'был(а) только что';
  const d = dayLabel(p.lastSeen);
  return d === 'Сегодня' ? `был(а) в ${hm(p.lastSeen)}` : d === 'Вчера' ? `был(а) вчера в ${hm(p.lastSeen)}` : `был(а) ${d}`;
};
const size = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' МБ' : Math.max(1, Math.round((n || 0) / 1024)) + ' КБ');
const dd = (t) => new Date(t).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' });
const yrs = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'год' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'года' : 'лет');
const bday = (d) => {
  const [y, mo, da] = d.split('-').map(Number); if (!y) return '';
  const now = new Date(); let age = now.getFullYear() - y;
  if (now < new Date(now.getFullYear(), mo - 1, da)) age--;
  return `${da} ${new Date(y, mo - 1, da).toLocaleDateString('ru', { month: 'long' })} (${age} ${yrs(age)})`;
};
const ext = (name) => (String(name || 'file').split('.').pop() || 'file').slice(0, 4);
const URL_RE = /(https?:\/\/[^\s<]+)/;
const Linkify = ({ text }) => text.split(URL_RE).map((p, i) => (i % 2
  ? <a key={i} href={p} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{p}</a> : p));

const Ava = ({ name, url, online }) => (
  <div className="avw">{url ? <img className="ava" src={url} alt="" /> : <div className="ava">{(name || '?')[0]}</div>}{online && <i className="odot" />}</div>);

/* ---------- Вход ---------- */
function Login({ onDone }) {
  const [login, setLogin] = useState(''); const [step, setStep] = useState(1);
  const [code, setCode] = useState(''); const [name, setName] = useState('');
  const [hint, setHint] = useState(''); const [err, setErr] = useState('');
  const run = async (fn) => { setErr(''); try { await fn(); } catch (e) { setErr(e.message); } };
  const request = () => run(async () => { const r = await api('/auth/request', { login }); setHint(r.devCode || ''); setStep(2); });
  const verify = () => run(async () => {
    const r = await api('/auth/verify', { login, code, name });
    localStorage.setItem('token', r.token); onDone(r.user); });
  return (
    <div className="login"><div className="login-box">
      <div className="logo"><Icon n="send" size={46} /></div><h1>Вход в Telegram</h1>
      {step === 1 ? (<>
        <p>Введите email или номер телефона</p>
        <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="name@mail.com или +49151..." onKeyDown={(e) => e.key === 'Enter' && request()} />
        <button onClick={request}>Получить код</button></>) : (<>
        <p>Код отправлен на {login}{hint && <b> (тест: {hint})</b>}</p>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Код" autoFocus />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше имя (для новой регистрации)" onKeyDown={(e) => e.key === 'Enter' && verify()} />
        <button onClick={verify}>Войти</button></>)}
      {err && <div className="err">{err}</div>}
    </div></div>);
}

/* ---------- Голосовое сообщение ---------- */
function Voice({ m }) {
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

function Body({ m, onView }) {
  const stop = (e) => e.stopPropagation();
  return (<>
    {m.kind === 'voice' && <Voice m={m} />}
    {m.kind === 'image' && <img className="pic" src={m.file_url} alt="" onClick={(e) => { stop(e); onView(m); }} />}
    {m.kind === 'video' && <video className="pic" controls preload="metadata" src={m.file_url} onClick={stop} />}
    {m.kind === 'file' && <a className="file" href={m.file_url} download={m.file_name} onClick={stop}>
      <span className="fi">{ext(m.file_name)}</span><span><b>{m.file_name}</b><small>{size(m.file_size)}</small></span></a>}
    {m.text && <div className="txt"><Linkify text={m.text} /></div>}
  </>);
}

/* ---------- Панель «Информация» ---------- */
const TABS = [['media', 'Медиа'], ['files', 'Файлы'], ['links', 'Ссылки'], ['voice', 'Голос']];
function Info({ chat, status, meId, onClose, onView, onOpenUser }) {
  const [data, setData] = useState(null); const [tab, setTab] = useState('media'); const [items, setItems] = useState([]);
  useEffect(() => { api(`/chats/${chat.id}/info`).then(setData); }, [chat.id]);
  useEffect(() => { setItems([]); api(`/chats/${chat.id}/shared?type=${tab}`).then(setItems); }, [chat.id, tab]);
  const u = data?.user;
  const links = items.flatMap((m) => (m.text.match(/https?:\/\/[^\s<]+/g) || []).map((url) => ({ url, m })));
  const host = (url) => { try { return new URL(url).hostname; } catch { return url; } };
  return (
    <div className="info">
      <div className="ihead"><button className="ib" onClick={onClose}><Icon n="close" /></button><b>Информация</b></div>
      <div className="iscroll">
        <div className="iprof"><Ava name={chat.name} url={u?.avatar || chat.avatar} /><div className="nm bignm">{chat.name}</div>
          <div className="sub">{data?.type === 'group' ? `${data.members.length} участн.` : status}</div></div>
        {u && <div className="icard">
          <div><b>{u.login}</b><small>{u.login.includes('@') ? 'Email' : 'Телефон'}</small></div>
          {u.bio && <div><b>{u.bio}</b><small>О себе</small></div>}
          {u.birthday && <div><b>{bday(u.birthday)}</b><small>День рождения</small></div>}
          <div><b>@{u.username}</b><small>Имя пользователя</small></div></div>}
        {data?.type === 'group' && <div className="icard">{data.members.map((x) => (
          <div key={x.id} className="mrow" onClick={() => x.id !== meId && onOpenUser(x)}><Ava name={x.name} url={x.avatar} />
            <div><b>{x.name}{x.id === meId ? ' (вы)' : ''}</b><small>@{x.username}</small></div></div>))}</div>}
        <div className="tabs">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
        <div className="icard">
          {tab === 'media' && <div className="grid">{items.map((m) => m.kind === 'image'
            ? <img key={m.id} src={m.file_url} alt="" onClick={() => onView(m)} />
            : <video key={m.id} src={m.file_url} preload="metadata" muted onClick={() => onView(m)} />)}</div>}
          {tab === 'files' && items.map((m) => (
            <a key={m.id} className="frow" href={m.file_url} download={m.file_name}><span className="fi">{ext(m.file_name)}</span>
              <span><b>{m.file_name}</b><small>{size(m.file_size)} • {dd(m.created_at)}</small></span></a>))}
          {tab === 'links' && links.map(({ url }, i) => (
            <a key={i} className="frow" href={url} target="_blank" rel="noopener noreferrer"><span className="fi blue">{host(url)[0]}</span>
              <span><b>{host(url)}</b><small>{url}</small></span></a>))}
          {tab === 'voice' && items.map((m) => (
            <div key={m.id} className="vrow"><div><b>{m.sender_id === meId ? 'Вы' : m.sender_name}</b><small>{dd(m.created_at)}</small></div><Voice m={m} /></div>))}
          {!(tab === 'links' ? links.length : items.length) && <div className="sub">Пока ничего нет</div>}
        </div>
      </div>
    </div>);
}

/* ---------- Настройки профиля ---------- */
function Settings({ me, onSave, onClose }) {
  const [f, setF] = useState({ name: me.name, bio: me.bio || '', birthday: me.birthday || '', username: me.username, avatar: me.avatar || '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pick = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { setF({ ...f, avatar: await upload(file) }); } catch (x) { setErr(x.message); }
  };
  const save = async () => { setErr(''); try { onSave(await api('/me', f, 'PATCH')); onClose(); } catch (x) { setErr(x.message); } };
  return (
    <div className="modal-back" onClick={onClose}><div className="panel" onClick={(e) => e.stopPropagation()}>
      <h2>Изменить профиль</h2>
      <label className="avabtn"><Ava name={f.name} url={f.avatar} /><span className="cam"><Icon n="camera" size={28} /></span>
        <input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={pick} /></label>
      <label>Имя<input value={f.name} onChange={set('name')} maxLength={64} /></label>
      <label>О себе<input value={f.bio} onChange={set('bio')} maxLength={70} /><small>{f.bio.length} / 70</small></label>
      <label>День рождения<input type="date" value={f.birthday} onChange={set('birthday')} /></label>
      <label>Имя пользователя<input value={f.username} onChange={set('username')} /><small>Только a–z, 0–9 и _, минимум 5 символов</small></label>
      <div className="sub">Вы вошли как {me.login}</div>
      {err && <div className="err">{err}</div>}
      <div className="row"><button className="ghost danger-t" onClick={() => { localStorage.removeItem('token'); location.reload(); }}>Выйти</button>
        <span className="grow" /><button className="ghost" onClick={onClose}>Отмена</button><button onClick={save}>Сохранить</button></div>
    </div></div>);
}

/* ---------- Чат ---------- */
function Chat({ me, onMe }) {
  const [chats, setChats] = useState([]); const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]); const [text, setText] = useState('');
  const [q, setQ] = useState(''); const [found, setFound] = useState([]);
  const [typing, setTyping] = useState(false); const [reply, setReply] = useState(null);
  const [editing, setEditing] = useState(null); const [group, setGroup] = useState(null);
  const [err, setErr] = useState(''); const [menu, setMenu] = useState(null);
  const [del, setDel] = useState(null); const [delAll, setDelAll] = useState(false);
  const [emoji, setEmoji] = useState(false); const [settings, setSettings] = useState(false);
  const [rec, setRec] = useState(false); const [secs, setSecs] = useState(0);
  const [info, setInfo] = useState(false); const [viewer, setViewer] = useState(null);
  const [presence, setPresence] = useState({});
  const sock = useRef(null); const activeRef = useRef(null); const msgsRef = useRef([]); const endRef = useRef(null); const recRef = useRef(null);
  activeRef.current = active; msgsRef.current = msgs;
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  const loadChats = () => api('/chats').then((rows) => {
    setChats(rows);
    setPresence((p) => { const n = { ...p }; rows.forEach((r) => { if (r.peer_id) n[r.peer_id] = { online: !!r.online, lastSeen: r.last_seen }; }); return n; });
  });
  const markRead = () => {
    const a = activeRef.current; if (!a || document.visibilityState !== 'visible') return;
    const last = msgsRef.current.reduce((x, m) => Math.max(x, m.id), 0);
    if (last) sock.current?.emit('read', { chatId: a.id, upTo: last });
  };

  useEffect(() => {
    const close = (e) => { if (e.type === 'click' || e.key === 'Escape') setMenu(null); };
    window.addEventListener('click', close); window.addEventListener('keydown', close);
    document.addEventListener('visibilitychange', markRead);
    return () => { window.removeEventListener('click', close); window.removeEventListener('keydown', close); document.removeEventListener('visibilitychange', markRead); };
  }, []);
  useEffect(() => {
    if (!rec) return;
    setSecs(0); const i = setInterval(() => setSecs((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, [rec]);
  useEffect(() => {
    loadChats();
    const s = io({ auth: { token: getToken() } }); sock.current = s;
    s.on('message', (m) => { if (m.chat_id === activeRef.current?.id) setMsgs((x) => [...x, m]); loadChats(); });
    s.on('message:update', (m) => { setMsgs((x) => x.map((y) => (y.id === m.id ? m : y))); loadChats(); });
    s.on('message:delete', ({ id }) => { setMsgs((x) => x.filter((y) => y.id !== id)); loadChats(); });
    s.on('presence', ({ userId, online, lastSeen }) => setPresence((p) => ({ ...p, [userId]: { online, lastSeen: lastSeen || p[userId]?.lastSeen } })));
    s.on('read', loadChats);
    s.on('chats', loadChats);
    let t; s.on('typing', ({ chatId }) => {
      if (chatId === activeRef.current?.id) { setTyping(true); clearTimeout(t); t = setTimeout(() => setTyping(false), 2000); } });
    return () => s.disconnect();
  }, []);
  useEffect(() => { setReply(null); setEditing(null); setText(''); setEmoji(false); setInfo(false); setMsgs([]); if (active) api(`/chats/${active.id}/messages`).then(setMsgs); }, [active?.id]);
  useEffect(() => { endRef.current?.scrollIntoView(); markRead(); }, [msgs]);
  useEffect(() => {
    if (!q.trim()) return setFound([]);
    const h = setTimeout(() => api('/users/search?q=' + encodeURIComponent(q)).then(setFound), 250);
    return () => clearTimeout(h);
  }, [q]);

  const openMenu = (e, m) => {
    e.preventDefault(); e.stopPropagation();
    setMenu({ m, x: Math.max(8, Math.min(e.clientX, window.innerWidth - 230)), y: Math.max(8, Math.min(e.clientY, window.innerHeight - 220)) });
  };
  const open = (c) => setActive({ id: c.id, name: c.name, username: c.username, avatar: c.avatar, type: c.type, members_count: c.members_count, peer_id: c.peer_id });
  const openUser = async (u) => {
    const { id } = await api('/chats/direct', { userId: u.id });
    await loadChats(); setQ(''); setActive({ id, name: u.name, username: u.username, avatar: u.avatar, type: 'direct', peer_id: u.id });
  };
  const togglePick = (u) => setGroup((g) => ({ ...g, picked: g.picked.some((p) => p.id === u.id) ? g.picked.filter((p) => p.id !== u.id) : [...g.picked, u] }));
  const createGroup = async () => {
    setErr('');
    try {
      const { id } = await api('/chats/group', { title: group.title, userIds: group.picked.map((p) => p.id) });
      await loadChats(); setActive({ id, name: group.title, type: 'group', members_count: group.picked.length + 1 }); setGroup(null); setQ('');
    } catch (e) { setErr(e.message); }
  };
  const send = () => {
    if (!text.trim() || !active) return;
    if (editing) sock.current.emit('edit', { id: editing.id, text });
    else sock.current.emit('message', { chatId: active.id, text, replyTo: reply?.id });
    setText(''); setReply(null); setEditing(null);
  };
  const attach = async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f || !active) return;
    try {
      const d = await uploadFile(f);
      const kind = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'file';
      sock.current.emit('message', { chatId: active.id, kind, fileUrl: d.url, fileName: d.name, fileSize: d.size, text, replyTo: reply?.id });
      setText(''); setReply(null);
    } catch (x) { alert(x.message); }
  };
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream); const chunks = []; const samples = []; const t0 = Date.now();
      const ctx = new (window.AudioContext || window.webkitAudioContext)(); const an = ctx.createAnalyser(); an.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(an); const buf = new Uint8Array(an.fftSize);
      const iv = setInterval(() => { an.getByteTimeDomainData(buf); let mx = 0; for (const v of buf) mx = Math.max(mx, Math.abs(v - 128)); samples.push(mx / 128); }, 80);
      mr.chatId = active.id; mr.replyTo = reply?.id;
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = async () => {
        clearInterval(iv); ctx.close(); stream.getTracks().forEach((t) => t.stop());
        if (!mr.wantSend) return;
        const N = 40;
        const bars = Array.from({ length: N }, (_, i) => {
          const a = Math.floor((i * samples.length) / N); const b = Math.max(a + 1, Math.floor(((i + 1) * samples.length) / N));
          return Math.max(0, ...samples.slice(a, b));
        });
        const peak = Math.max(...bars, 0.05);
        const waveform = bars.map((v) => Math.round(4 + (v / peak) * 22)).join(',');
        try {
          const fileUrl = await upload(new Blob(chunks, { type: mr.mimeType }));
          sock.current.emit('message', { chatId: mr.chatId, kind: 'voice', fileUrl, waveform, duration: Math.max(1, Math.round((Date.now() - t0) / 1000)), replyTo: mr.replyTo });
        } catch (e) { alert(e.message); }
      };
      mr.start(); recRef.current = mr; setRec(true);
    } catch { alert('Нет доступа к микрофону. Разрешите его в настройках браузера.'); }
  };
  const stopRec = (wantSend) => { const mr = recRef.current; if (!mr) return; mr.wantSend = wantSend; mr.stop(); recRef.current = null; setRec(false); if (wantSend) setReply(null); };
  const confirmDelete = () => { sock.current.emit('delete', { id: del.id, forAll: delAll }); setDel(null); setDelAll(false); };

  const isGroup = active?.type === 'group';
  const canAll = del && (del.sender_id === me.id || active.type === 'direct');
  const peerRead = chats.find((c) => c.id === active?.id)?.peer_read || 0;
  const status = typing ? 'печатает…' : isGroup ? `${active?.members_count} участн.` : seen(presence[active?.peer_id]);

  return (
    <div className={'app' + (active ? ' has-active' : '')}>
      <aside>
        <div className="top">
          <label className="sbox"><Icon n="search" size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск" /></label>
          {!group && <button className="ib" title="Новая группа" onClick={() => setGroup({ title: '', picked: [] })}><Icon n="group" /></button>}
        </div>
        {group && (
          <div className="gpanel">
            <input value={group.title} onChange={(e) => setGroup({ ...group, title: e.target.value })} placeholder="Название группы" />
            <div className="sub">{group.picked.length ? 'Участники: ' + group.picked.map((p) => p.name).join(', ') : 'Найдите людей через поиск и нажмите на них'}</div>
            {err && <div className="err">{err}</div>}
            <div className="row"><button className="ghost" onClick={() => { setGroup(null); setErr(''); }}>Отмена</button><button onClick={createGroup}>Создать</button></div>
          </div>)}
        <div className="list">
          {q.trim() ? (found.length ? found.map((u) => (
            <div key={u.id} className={'item' + (group?.picked.some((p) => p.id === u.id) ? ' sel' : '')} onClick={() => (group ? togglePick(u) : openUser(u))}>
              <Ava name={u.name} url={u.avatar} /><div className="meta"><div className="nm">{u.name}</div><div className="sub">@{u.username}</div></div></div>))
            : <div className="empty">Никого не найдено</div>)
          : chats.length ? chats.map((c) => (
            <div key={c.id} className={'item' + (active?.id === c.id ? ' sel' : '')} onClick={() => open(c)}>
              <Ava name={c.name} url={c.avatar} online={presence[c.peer_id]?.online} />
              <div className="meta">
                <div className="line"><span className="nm">{c.name}</span><span className="tl">{listTime(c.last_at)}</span></div>
                <div className="line"><span className="sub">{c.last_text || 'Нет сообщений'}</span>
                  {c.unread > 0 && active?.id !== c.id && <span className="badge">{c.unread}</span>}</div>
              </div></div>))
          : <div className="empty">Найдите собеседника через поиск или создайте группу</div>}
        </div>
        <div className="me" onClick={() => setSettings(true)} title="Настройки профиля"><Ava name={me.name} url={me.avatar} />
          <div><div className="nm">{me.name}</div><div className="sub">@{me.username} · настройки</div></div></div>
      </aside>

      <main>
        {active ? (<>
          <header onClick={() => setInfo(true)}>
            <button className="ib back" onClick={(e) => { e.stopPropagation(); setActive(null); }}><Icon n="back" /></button>
            <Ava name={active.name} url={active.avatar} online={!isGroup && presence[active.peer_id]?.online} />
            <div><div className="nm">{active.name}</div><div className={'sub' + (typing || presence[active.peer_id]?.online ? ' live' : '')}>{status}</div></div>
          </header>
          <div className="msgs">
            {msgs.map((m, i) => {
              const own = m.sender_id === me.id; const read = m.id <= peerRead;
              const newDay = i === 0 || new Date(m.created_at).toDateString() !== new Date(msgs[i - 1].created_at).toDateString();
              return (<Fragment key={m.id}>
                {newDay && <div className="day"><span>{dayLabel(m.created_at)}</span></div>}
                <div className={'bubble ' + (own ? 'out' : 'in')} onContextMenu={(e) => openMenu(e, m)} onClick={(e) => coarse && openMenu(e, m)}>
                  {isGroup && !own && <div className="who">{m.sender_name}</div>}
                  {m.reply_to && <div className="quote"><b>{m.reply_name || ''}</b><div>{m.reply_name ? m.reply_text : 'Сообщение удалено'}</div></div>}
                  <Body m={m} onView={setViewer} />
                  <span className={'time' + (own && read ? ' read' : '')}>{m.edited ? 'изм. ' : ''}{hm(m.created_at)}{own && <Icon n={read ? 'dcheck' : 'check'} size={15} />}</span>
                </div></Fragment>); })}
            <div ref={endRef} />
          </div>
          {(reply || editing) && (
            <div className="strip"><Icon n={editing ? 'edit' : 'reply'} size={20} />
              <div className="quote"><b>{editing ? 'Редактирование' : reply.sender_name}</b><div>{(editing || reply).text || 'Вложение'}</div></div>
              <button className="ib" onClick={() => { setReply(null); setEditing(null); setText(''); }}><Icon n="close" size={20} /></button></div>)}
          {emoji && <div className="emoji">{EMOJI.map((e) => <button key={e} onClick={() => setText((t) => t + e)}>{e}</button>)}</div>}
          {rec ? (
            <div className="composer"><div className="pill recbar"><span className="dot" /><b>{fmt(secs)}</b><span className="grow" />
              <button className="ghost" onClick={() => stopRec(false)}>Отмена</button></div>
              <button className="fab" title="Отправить" onClick={() => stopRec(true)}><Icon n="send" /></button></div>
          ) : (
            <div className="composer">
              <div className="pill">
                <button className="ib" title="Эмодзи" onClick={() => setEmoji((v) => !v)}><Icon n="smile" /></button>
                <input value={text} placeholder="Сообщение" onChange={(e) => { setText(e.target.value); sock.current.emit('typing', { chatId: active.id }); }}
                  onKeyDown={(e) => e.key === 'Enter' && send()} />
                <label className="ib" title="Прикрепить файл"><Icon n="clip" /><input type="file" hidden onChange={attach} /></label>
              </div>
              {text.trim() || editing
                ? <button className="fab" title={editing ? 'Сохранить' : 'Отправить'} onClick={send}><Icon n={editing ? 'check' : 'send'} /></button>
                : <button className="fab" title="Записать голосовое" onClick={startRec}><Icon n="mic" /></button>}
            </div>)}</>)
        : <div className="placeholder"><span>Выберите чат, чтобы начать переписку</span></div>}
      </main>

      {menu && (
        <div className="ctx" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { setReply(menu.m); setEditing(null); setMenu(null); }}><Icon n="reply" size={20} />Ответить</button>
          {menu.m.text && <button onClick={() => { navigator.clipboard?.writeText(menu.m.text); setMenu(null); }}><Icon n="copy" size={20} />Копировать текст</button>}
          {menu.m.sender_id === me.id && menu.m.kind === 'text' && <button onClick={() => { setEditing(menu.m); setReply(null); setText(menu.m.text); setMenu(null); }}><Icon n="edit" size={20} />Изменить</button>}
          <button className="danger" onClick={() => { setDel(menu.m); setDelAll(false); setMenu(null); }}><Icon n="trash" size={20} />Удалить</button>
        </div>)}
      {del && (
        <div className="modal-back" onClick={() => setDel(null)}><div className="panel" onClick={(e) => e.stopPropagation()}>
          <h2>Удалить сообщение</h2><div>Вы точно хотите удалить это сообщение?</div>
          {canAll && <label className="checkrow"><input type="checkbox" checked={delAll} onChange={(e) => setDelAll(e.target.checked)} />
            {active.type === 'direct' ? `Также удалить для ${active.name}` : 'Удалить для всех'}</label>}
          <div className="row"><button className="ghost" onClick={() => setDel(null)}>Отмена</button><button className="ghost danger-t" onClick={confirmDelete}>Удалить</button></div>
        </div></div>)}
      {info && active && <Info chat={active} status={status} meId={me.id} onClose={() => setInfo(false)} onView={setViewer} onOpenUser={(u) => { setInfo(false); openUser(u); }} />}
      {viewer && (
        <div className="modal-back" onClick={() => setViewer(null)}>
          {viewer.kind === 'video' ? <video className="big" src={viewer.file_url} controls autoPlay onClick={(e) => e.stopPropagation()} /> : <img className="big" src={viewer.file_url} alt="" />}
        </div>)}
      {settings && <Settings me={me} onSave={onMe} onClose={() => setSettings(false)} />}
    </div>);
}

export default function App() {
  const [me, setMe] = useState(null); const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!getToken()) return setReady(true);
    api('/me').then(setMe).catch(() => localStorage.removeItem('token')).finally(() => setReady(true));
  }, []);
  if (!ready) return null;
  return me ? <Chat me={me} onMe={setMe} /> : <Login onDone={setMe} />;
}
