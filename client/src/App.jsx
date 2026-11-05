import { Fragment, useEffect, useReducer, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api, getToken, upload, uploadFile } from './api.js';
import { Icon } from './icons.jsx';
import { Ava, fmt, hm, dayLabel, listTime, seen, twemojiUrl, isOneEmoji, Emo } from './utils.jsx';
import { Login } from './Login.jsx';
import { Body } from './voice.jsx';
import { Info } from './info.jsx';
import { EditProfile } from './editprofile.jsx';
import EmojiPicker from './EmojiPicker.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import { prefs, savePref, beep, isMuted, setMute } from './prefs.js';
import { ContactEdit } from './ContactEdit.jsx';
import { useCalls, CallUI } from './Calls.jsx';

const inFolder = (c, f) => f.id === 'all' || (f.kind === 'unread' ? c.unread > 0 : f.kind === 'direct' ? c.type === 'direct' || c.type === 'saved' : f.kind ? c.type === f.kind : (f.chatIds || []).includes(c.id));
const isDark = () => prefs.theme === 'dark' || (prefs.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
const chatIcon = (c) => (c.type === 'saved' ? 'bookmark' : null);
const REACT_BASE = ['❤️', '👍', '👎', '🔥', '🥰', '👏', '😁'];
const REACT_ALL = [...REACT_BASE, '🤔', '🤯', '😱', '🤬', '😢', '🎉', '🤩', '🤮', '💩', '🙏', '👌', '🤡', '🥱', '😍', '🐳', '💯', '🤣', '⚡', '🏆', '💔', '🤨', '😐', '🍓', '😈', '😴', '😭', '🤓', '👻', '👀', '🙈', '😇', '😨', '🤝', '🤗', '🫡', '😘', '😎', '🤷'];
const KINDLBL = { voice: 'Голосовое сообщение', image: 'Фото', video: 'Видео', audio: 'Музыка', file: 'Файл', sticker: 'Стикер', gif: 'GIF' };

function Chat({ me, onMe }) {
  const [chats, setChats] = useState([]); const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]); const [text, setText] = useState('');
  const [q, setQ] = useState(''); const [found, setFound] = useState({ users: [], channels: [] });
  const [typing, setTyping] = useState(false); const [reply, setReply] = useState(null);
  const [editing, setEditing] = useState(null); const [group, setGroup] = useState(null);
  const [err, setErr] = useState(''); const [menu, setMenu] = useState(null);
  const [del, setDel] = useState(null); const [delAll, setDelAll] = useState(false);
  const [emoji, setEmoji] = useState(false); const [rec, setRec] = useState(false); const [secs, setSecs] = useState(0);
  const [info, setInfo] = useState(false); const [viewer, setViewer] = useState(null); const [presence, setPresence] = useState({});
  const [pop, setPop] = useState(null); const [more, setMore] = useState(false);
  const [panel, setPanel] = useState(null); const [modal, setModal] = useState(null);
  const [tabF, setTabF] = useState('all'); const [msearch, setMsearch] = useState(null); const [down, setDown] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', username: '', text: '' });
  const [cq, setCq] = useState(''); const [cres, setCres] = useState([]);
  const [, bump] = useReducer((x) => x + 1, 0);
  const [sel, setSel] = useState(null); const [subm, setSubm] = useState(null); const [side, setSide] = useState(null);
  const [gone, setGone] = useState([]); const [fresh, setFresh] = useState([]);
  const [pins, setPins] = useState([]); const [pinIdx, setPinIdx] = useState(0); const [pinDlg, setPinDlg] = useState(null); const [pinAll, setPinAll] = useState(true);
  const [fwd, setFwd] = useState(null); const [fwdTo, setFwdTo] = useState([]);
  const sock = useRef(null); const activeRef = useRef(null); const msgsRef = useRef([]); const endRef = useRef(null); const recRef = useRef(null);
  const mediaIn = useRef(null); const fileIn = useRef(null); const audioIn = useRef(null);
  const chatsRef = useRef([]); const taRef = useRef(null);
  const calls = useCalls({ sock });
  activeRef.current = active; msgsRef.current = msgs; chatsRef.current = chats;
  const chatClass = (id) => { const t = chatsRef.current.find((c) => c.id === id)?.type; return t === 'group' ? 'group' : t === 'channel' ? 'channel' : 'direct'; };
  useEffect(() => { if (!text && taRef.current) taRef.current.style.height = 'auto'; }, [text]);
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  const loadChats = () => api('/chats').then((rows) => {
    setChats(rows);
    setPresence((p) => { const n = { ...p }; rows.forEach((r) => { if (r.peer_id) n[r.peer_id] = { online: !!r.online, lastSeen: r.last_seen }; }); return n; });
    return rows;
  });
  const markRead = () => {
    const a = activeRef.current; if (!a || document.visibilityState !== 'visible') return;
    const last = msgsRef.current.reduce((x, m) => Math.max(x, m.id), 0);
    if (last) sock.current?.emit('read', { chatId: a.id, upTo: last });
  };
  const loadPins = () => { const a = activeRef.current; if (a) api(`/chats/${a.id}/pins`).then(setPins).catch(() => setPins([])); };
  const closeAll = () => { setMenu(null); setPop(null); setMore(false); setSubm(null); };

  useEffect(() => {
    const close = (e) => { if (e.type === 'click' || e.key === 'Escape') closeAll(); };
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
    const s = io({ auth: { token: getToken() } }); sock.current = s; calls.bind(s);
    s.on('message', (m) => {
      if (m.chat_id === activeRef.current?.id) { setMsgs((x) => [...x, m]); setFresh((f) => [...f.slice(-30), m.id]); }
      if (m.sender_id !== me.id && !isMuted(m.chat_id) && prefs['n_' + chatClass(m.chat_id)]) {
        const away = document.visibilityState !== 'visible';
        if ((away || m.chat_id !== activeRef.current?.id) && prefs.volume > 0) beep(prefs.volume / 10);
        if (away && prefs.notify && window.Notification?.permission === 'granted') new Notification(m.sender_name, { body: prefs['pv_' + chatClass(m.chat_id)] ? (m.text || 'Вложение') : 'Новое сообщение' });
      }
      loadChats();
    });
    s.on('message:update', (m) => { setMsgs((x) => x.map((y) => (y.id === m.id ? m : y))); loadChats(); });
    s.on('message:delete', ({ id }) => {
      setGone((g) => [...g, id]);
      setTimeout(() => { setMsgs((x) => x.filter((y) => y.id !== id)); setGone((g) => g.filter((x) => x !== id)); loadChats(); }, 260);
    });
    s.on('notice', (t) => alert(t));
    s.on('pins', ({ chatId }) => { if (chatId === activeRef.current?.id) loadPins(); });
    s.on('logout', () => { localStorage.removeItem('token'); location.reload(); });
    s.on('presence', ({ userId, online, lastSeen }) => setPresence((p) => ({ ...p, [userId]: { online, lastSeen: lastSeen || p[userId]?.lastSeen } })));
    s.on('read', loadChats); s.on('chats', loadChats);
    let t; s.on('typing', ({ chatId }) => {
      if (chatId === activeRef.current?.id) { setTyping(true); clearTimeout(t); t = setTimeout(() => setTyping(false), 2000); } });
    return () => s.disconnect();
  }, []);
  useEffect(() => {
    setReply(null); setEditing(null); setText(''); setEmoji(false); setInfo(false); setMsearch(null); setMsgs([]); setSel(null); setSide(null); setSubm(null); setPins([]); setPinIdx(0);
    if (active) { api(`/chats/${active.id}/messages`).then(setMsgs); loadPins(); }
  }, [active?.id]);
  useEffect(() => { endRef.current?.scrollIntoView(); markRead(); }, [msgs]);
  useEffect(() => {
    if (!q.trim()) return setFound({ users: [], channels: [] });
    const h = setTimeout(async () => {
      const [users, channels] = await Promise.all([api('/users/search?q=' + encodeURIComponent(q)), api('/channels/search?q=' + encodeURIComponent(q))]);
      setFound({ users, channels });
    }, 250);
    return () => clearTimeout(h);
  }, [q]);
  useEffect(() => {
    if (!msearch?.q.trim()) return;
    const h = setTimeout(() => api(`/chats/${active.id}/search?q=${encodeURIComponent(msearch.q)}`).then((res) => setMsearch((s) => (s ? { ...s, res } : s))), 250);
    return () => clearTimeout(h);
  }, [msearch?.q]);
  useEffect(() => {
    if (!cq.trim()) return setCres([]);
    const h = setTimeout(() => api('/users/search?q=' + encodeURIComponent(cq)).then(setCres), 250);
    return () => clearTimeout(h);
  }, [cq]);

  const openRow = (rows, id) => { setActive(rows.find((r) => r.id === id) || null); setQ(''); };
  const openUser = async (u) => { const { id } = await api('/chats/direct', { userId: u.id }); openRow(await loadChats(), id); setModal(null); };
  const openSaved = async () => { const { id } = await api('/chats/saved', {}); openRow(await loadChats(), id); setPop(null); };
  const joinChannel = async (c) => { const { id } = await api(`/channels/${c.id}/join`, {}); openRow(await loadChats(), id); };
  const togglePick = (u) => setGroup((g) => ({ ...g, picked: g.picked.some((p) => p.id === u.id) ? g.picked.filter((p) => p.id !== u.id) : [...g.picked, u] }));
  const createGroup = async () => {
    setErr('');
    try { const { id } = await api('/chats/group', { title: group.title, userIds: group.picked.map((p) => p.id) }); openRow(await loadChats(), id); setGroup(null); }
    catch (e) { setErr(e.message); }
  };
  const createChannel = async () => {
    setErr('');
    try { const { id } = await api('/chats/channel', form); openRow(await loadChats(), id); setModal(null); setForm({ title: '', description: '', username: '', text: '' }); }
    catch (e) { setErr(e.message); }
  };
  const sendReport = async () => { setErr(''); try { await api('/report', { text: form.text }); setModal(null); setForm({ ...form, text: '' }); alert('Спасибо! Сообщение отправлено.'); } catch (e) { setErr(e.message); } };
  const toggleMute = (id) => { setMute(id, isMuted(id) ? 0 : Infinity); bump(); };
  const leave = async (label) => {
    if (!confirm(label + '?')) return;
    await api(`/chats/${active.id}/leave`, {}); setActive(null); loadChats();
  };
  const myReact = (m) => m.reactions?.find((r) => r.users.includes(me.id))?.emoji;
  const react = (m, emoji) => { sock.current.emit('react', { id: m.id, emoji }); setMenu(null); };
  const confirmPin = async () => { try { await api('/pins', { messageId: pinDlg.id, forAll: pinAll }); } catch (e) { alert(e.message); } setPinDlg(null); };
  const unpin = async (m) => { try { await api('/pins/' + m.id, {}, 'DELETE'); } catch (e) { alert(e.message); } };
  const doForward = () => {
    fwdTo.forEach((cid) => sock.current.emit('forward', { ids: fwd, chatId: cid }));
    const first = chats.find((c) => c.id === fwdTo[0]); setFwd(null); setFwdTo([]); setSel(null); if (first) setActive(first);
  };
  const sendMedia = (kind, url) => { if (!cur) return; sock.current.emit('message', { chatId: cur.id, kind, fileUrl: url, replyTo: reply?.id }); setReply(null); setEmoji(false); };
  const setTtl = async (ttl) => { await api(`/chats/${cur.id}/ttl`, { ttl }); setPop(null); setSubm(null); loadChats(); };
  const customTtl = () => { const h = Number(prompt('Через сколько часов удалять сообщения?', '12')); if (h > 0) setTtl(Math.round(h * 36e5)); };
  const toggleBlock = async () => { await api('/blocks/' + cur.peer_id, {}, cur.blocked ? 'DELETE' : 'POST'); setPop(null); loadChats(); };
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
      const kind = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'audio' : 'file';
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
  const confirmDelete = () => { del.forEach((m) => sock.current.emit('delete', { id: m.id, forAll: delAll })); setDel(null); setDelAll(false); setSel(null); };
  const jump = (m) => {
    setMsearch(null);
    setTimeout(() => {
      const el = document.getElementById('m' + m.id);
      if (!el) return alert('Это сообщение вне загруженной части истории');
      el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1500);
    }, 50);
  };
  const openMenu = (e, m) => {
    e.preventDefault(); e.stopPropagation(); setPop(null);
    setMenu({ m, x: Math.max(8, Math.min(e.clientX, window.innerWidth - 350)), y: Math.max(8, Math.min(e.clientY, window.innerHeight - 400)), more: false });
  };
  const tog = (name) => (e) => { e.stopPropagation(); setMenu(null); setMore(false); setSubm(null); setPop(pop === name ? null : name); };

  const cur = active && (chats.find((c) => c.id === active.id) || active);
  const isGroup = cur?.type === 'group'; const isChannel = cur?.type === 'channel';
  const cls0 = isGroup ? 'group' : isChannel ? 'channel' : 'direct';
  const canPost = cur && (!isChannel || cur.owner_id === me.id);
  const muted = cur && isMuted(cur.id);
  const canAll = del && del.every((m) => m.sender_id === me.id || cur.type === 'direct');
  const peerRead = cur?.peer_read || 0;
  const status = typing ? 'печатает…' : isGroup ? `${cur?.members_count} участн.` : isChannel ? `${cur?.members_count} подписчиков` : cur?.type === 'saved' ? 'Ваши заметки' : seen(presence[cur?.peer_id]);
  const myChannel = chats.find((c) => c.type === 'channel' && c.owner_id === me.id);
  const folders = [{ id: 'all', name: 'Все' }, ...prefs.folders]; const fcur = folders.find((f) => f.id === tabF) || folders[0];
  const shown = chats.filter((c) => inFolder(c, fcur));
  const leaveLabel = !cur ? '' : isGroup ? 'Покинуть группу' : isChannel ? (cur.owner_id === me.id ? 'Удалить канал' : 'Отписаться') : 'Удалить чат';
  const dark = isDark();
  const pin = pins.length ? pins[pinIdx % pins.length] : null;
  useEffect(() => { document.title = prefs.titleChat && cur ? `${cur.name} — Telegram` : 'Telegram'; });

  return (
    <div className={'app' + (active ? ' has-active' : '')}>
      <aside className={prefs.tabsPos === 'left' ? 'tabs-left' : ''}>
        <div className="top">
          <button className="ib" onClick={tog('menu')} title="Меню"><Icon n="menu" /></button>
          <label className="sbox"><Icon n="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск" /></label>
        </div>
        {pop === 'menu' && (
          <div className="pop menu" onClick={(e) => e.stopPropagation()}>
            <div className="mh"><Ava name={me.name} url={me.avatar} /><b>{me.name}</b></div>
            <button onClick={() => { setPanel('settings'); setPop(null); }}><Icon n="user" size={20} />Мой профиль</button>
            <button onClick={openSaved}><Icon n="bookmark" size={20} />Избранное</button>
            <button onClick={() => { setModal('contacts'); setPop(null); }}><Icon n="users" size={20} />Контакты</button>
            <button onClick={() => { setPanel('settings'); setPop(null); }}><Icon n="gear" size={20} />Настройки</button>
            <button onClick={() => setMore((v) => !v)}><Icon n="more" size={20} />Ещё<span className="grow" /><Icon n="chev" size={18} /></button>
            {more && (
              <div className="pop sub2" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => { savePref('theme', dark ? 'light' : 'dark'); bump(); }}><Icon n="moon" size={20} />Ночной режим<span className="grow" /><i className={'sw' + (dark ? ' on' : '')}><i /></i></button>
                <button onClick={() => { savePref('fx', !prefs.fx); bump(); }}><Icon n="bolt" size={20} />Эффекты интерфейса<span className="grow" /><i className={'sw' + (prefs.fx ? ' on' : '')}><i /></i></button>
                <button onClick={() => window.open('https://telegram.org/faq', '_blank', 'noopener')}><Icon n="help" size={20} />Возможности Telegram</button>
                <button onClick={() => { setModal('bug'); setPop(null); setErr(''); }}><Icon n="bug" size={20} />Сообщить об ошибке</button>
                <button className="danger" onClick={() => { localStorage.removeItem('token'); location.reload(); }}><Icon n="back" size={20} />Выйти</button>
                <div className="ver">Telegram Clone 1.0</div>
              </div>)}
          </div>)}
        <div className="abody">
        {!q.trim() && !group && folders.length > 1 && (
          <div className="ftabs">{folders.map((f) => { const n = chats.filter((c) => c.unread > 0 && inFolder(c, f)).length;
            return <button key={f.id} className={fcur.id === f.id ? 'on' : ''} onClick={() => setTabF(f.id)}>{f.name}{n > 0 && <span className="badge">{n}</span>}</button>; })}</div>)}
        {group && (
          <div className="gpanel">
            <input value={group.title} onChange={(e) => setGroup({ ...group, title: e.target.value })} placeholder="Название группы" />
            <div className="sub">{group.picked.length ? 'Участники: ' + group.picked.map((p) => p.name).join(', ') : 'Найдите людей через поиск и нажмите на них'}</div>
            {err && <div className="err">{err}</div>}
            <div className="row"><button className="ghost" onClick={() => { setGroup(null); setErr(''); }}>Отмена</button><button onClick={createGroup}>Создать</button></div>
          </div>)}
        <div className="listwrap">
          <div className="list">
            {q.trim() ? (<>
              {found.users.map((u) => (
                <div key={'u' + u.id} className={'item' + (group?.picked.some((p) => p.id === u.id) ? ' sel' : '')} onClick={() => (group ? togglePick(u) : openUser(u))}>
                  <Ava name={u.name} url={u.avatar} /><div className="meta"><div className="nm">{u.name}</div><div className="sub">@{u.username}</div></div></div>))}
              {!group && found.channels.map((c) => (
                <div key={'c' + c.id} className="item" onClick={() => joinChannel(c)}>
                  <Ava name={c.name} icon="megaphone" /><div className="meta"><div className="nm">{c.name}</div><div className="sub">@{c.username} · {c.members_count} подписчиков</div></div></div>))}
              {!found.users.length && !found.channels.length && <div className="empty">Ничего не найдено</div>}</>)
            : shown.length ? shown.map((c) => (
              <div key={c.id} className={'item' + (active?.id === c.id ? ' sel' : '')} onClick={() => setActive(c)}>
                <Ava name={c.name} url={c.avatar} icon={chatIcon(c)} online={presence[c.peer_id]?.online} />
                <div className="meta">
                  <div className="line"><span className="nm">{c.type === 'channel' && <Icon n="megaphone" size={15} />}{c.type === 'group' && <Icon n="users" size={15} />}{c.name}</span>
                    {isMuted(c.id) && <Icon n="volumeoff" size={14} />}<span className="tl">{c.last_sender === me.id && c.type === 'direct' && <Icon n={c.peer_read >= c.last_id ? 'dcheck' : 'check'} size={16} />}{listTime(c.last_at)}</span></div>
                  <div className="line"><span className="sub">{c.last_text ? <span className="lt">{c.last_text}</span> : 'Нет сообщений'}</span>
                    {c.unread > 0 && active?.id !== c.id && <span className={'badge' + (isMuted(c.id) ? ' mute' : '')}>{c.unread}</span>}</div>
                </div></div>))
            : <div className="empty">{chats.length ? 'В этой папке пусто' : 'Найдите собеседника через поиск или создайте группу и канал кнопкой с карандашом'}</div>}
          </div>
          <div className="fabwrap">
            {pop === 'fab' && (
              <div className="pop up fabmenu" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => { setModal('channel'); setPop(null); setErr(''); }}><Icon n="megaphone" size={20} />Создать канал</button>
                <button onClick={() => { setGroup({ title: '', picked: [] }); setPop(null); setErr(''); }}><Icon n="users" size={20} />Создать группу</button>
              </div>)}
            <button className="fab2" title="Создать" onClick={tog('fab')}><Icon n={pop === 'fab' ? 'close' : 'edit'} /></button>
          </div>
        </div>
        </div>
        {panel === 'settings' && <SettingsPanel me={me} chats={chats} channel={myChannel} onClose={() => setPanel(null)} onEdit={() => setModal('edit')} onChange={bump}
          onOpenChannel={() => { setActive(myChannel); setPanel(null); }} />}
      </aside>

      <main>
        {cur ? (<>
          <header onClick={() => !msearch && !sel && setInfo(true)}>
            {sel ? (<>
              <button className="ib" title="Отмена" onClick={(e) => { e.stopPropagation(); setSel(null); }}><Icon n="close" /></button>
              <b className="selcount">Выбрано: {sel.length}</b><span className="grow" />
              <button className="ib" title="Копировать" disabled={!sel.length} onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(msgs.filter((m) => sel.includes(m.id) && m.text).map((m) => m.text).join('\n')); setSel(null); }}><Icon n="copy" /></button>
              <button className="ib" title="Переслать" disabled={!sel.length} onClick={(e) => { e.stopPropagation(); setFwd(sel); }}><Icon n="forward" /></button>
              <button className="ib" title="Удалить" disabled={!sel.length} onClick={(e) => { e.stopPropagation(); setDel(msgs.filter((m) => sel.includes(m.id))); setDelAll(false); }}><Icon n="trash" /></button>
            </>) : msearch ? (<>
              <button className="ib" onClick={(e) => { e.stopPropagation(); setMsearch(null); }}><Icon n="back" /></button>
              <input className="hsearch" autoFocus placeholder="Поиск сообщений" value={msearch.q} onClick={(e) => e.stopPropagation()} onChange={(e) => setMsearch({ q: e.target.value, res: [] })} />
            </>) : (<>
              <button className="ib back" onClick={(e) => { e.stopPropagation(); setActive(null); }}><Icon n="back" /></button>
              <Ava name={cur.name} url={cur.avatar} icon={chatIcon(cur) || (isChannel ? 'megaphone' : null)} online={!isGroup && presence[cur.peer_id]?.online} />
              <div className="hname"><div className="nm">{cur.name}</div><div className={'sub' + (typing || presence[cur.peer_id]?.online ? ' live' : '')}>{status}</div></div>
              <span className="grow" />
              {cur.type === 'direct' && !cur.blocked && <>
                <button className="ib" title="Видеозвонок" onClick={(e) => { e.stopPropagation(); calls.startCall(cur, true); }}><Icon n="video" /></button>
                <button className="ib" title="Позвонить" onClick={(e) => { e.stopPropagation(); calls.startCall(cur, false); }}><Icon n="phone" /></button></>}
              <button className="ib" title="Поиск" onClick={(e) => { e.stopPropagation(); setMsearch({ q: '', res: [] }); }}><Icon n="search" /></button>
              <div className="relw">
                <button className="ib" title="Ещё" onClick={tog('kebab')}><Icon n="more" /></button>
                {pop === 'kebab' && (
                  <div className="pop right" onClick={(e) => e.stopPropagation()}>
                    {cur.type === 'direct' && <button onClick={() => { setSide('contact'); setPop(null); }}><Icon n="edit" size={20} />Изменить</button>}
                    {muted
                      ? <button onClick={() => { setMute(cur.id, 0); bump(); setPop(null); }}><Icon n="volume" size={20} />Включить звук</button>
                      : <div className="itemwrap"><button onClick={() => setSubm(subm === 'mute' ? null : 'mute')}><Icon n="volumeoff" size={20} />Убрать звук…<span className="grow" /><Icon n="chev" size={18} /></button>
                        {subm === 'mute' && <div className="pop sub3">{[['1 час', 36e5], ['8 часов', 288e5], ['2 дня', 1728e5], ['Навсегда', Infinity]].map(([l, ms]) => (
                          <button key={l} onClick={() => { setMute(cur.id, ms); bump(); setPop(null); }}>{l}</button>))}</div>}</div>}
                    <div className="itemwrap"><button onClick={() => setSubm(subm === 'ttl' ? null : 'ttl')}><Icon n="clock" size={20} />Автоудаление<span className="grow" /><Icon n="chev" size={18} /></button>
                      {subm === 'ttl' && <div className="pop sub3">{[['Никогда', 0], ['1 день', 864e5], ['1 неделя', 6048e5], ['1 месяц', 2592e6]].map(([l, v]) => (
                        <button key={l} onClick={() => setTtl(v)}>{(cur.ttl || 0) === v ? <Icon n="check" size={18} /> : <span className="sp" />}{l}</button>))}
                        <button onClick={customTtl}><Icon n="sliders" size={18} />Выбрать другой срок</button></div>}</div>
                    <button onClick={() => { setSel([]); setPop(null); }}><Icon n="checkc" size={20} />Выбрать сообщения</button>
                    {cur.type === 'direct' && <button onClick={toggleBlock}><Icon n="block" size={20} />{cur.blocked ? 'Разблокировать' : 'Заблокировать'}</button>}
                    <div className="sep" />
                    <button className="danger" onClick={() => { setPop(null); leave(leaveLabel); }}><Icon n="trash" size={20} />{leaveLabel}</button>
                  </div>)}
              </div></>)}
          </header>
          {pin && !msearch && !sel && (
            <div className="pinbar" onClick={() => { jump(pin); setPinIdx((i) => (i + 1) % pins.length); }}>
              <i className="pbar" />
              <div className="pbody"><div className="pt">{pins.length > 1 ? `Закреплённое сообщение #${(pinIdx % pins.length) + 1}` : 'Закреплённое сообщение'}</div>
                <div className="px">{pin.text ? <span className="lt">{pin.text}</span> : KINDLBL[pin.kind] || 'Вложение'}</div></div>
              {(cur.type !== 'channel' || cur.owner_id === me.id) && <button className="ib" title="Открепить" onClick={(e) => { e.stopPropagation(); unpin(pin); }}><Icon n="pinoff" size={20} /></button>}
            </div>)}
          {msearch?.q.trim() && (
            <div className="sres">{msearch.res.length ? msearch.res.map((m) => (
              <div key={m.id} className="sr" onClick={() => jump(m)}><b>{m.sender_name}</b><small>{dayLabel(m.created_at)}, {hm(m.created_at)}</small><div>{m.text}</div></div>))
              : <div className="empty">Ничего не найдено</div>}</div>)}
          <div key={cur.id} className={'msgs' + (sel ? ' selmode' : '') + (pin && !msearch ? ' haspin' : '')} onScroll={(e) => setDown(e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight > 300)}>
            {msgs.map((m, i) => {
              const own = m.sender_id === me.id; const read = m.id <= peerRead; const side = isChannel ? 'in' : own ? 'out' : 'in';
              const tail = i === msgs.length - 1 || msgs[i + 1].sender_id !== m.sender_id; const gs = i === 0 || msgs[i - 1].sender_id !== m.sender_id;
              const newDay = i === 0 || new Date(m.created_at).toDateString() !== new Date(msgs[i - 1].created_at).toDateString();
              return (<Fragment key={m.id}>
                {newDay && <div className="day"><span>{dayLabel(m.created_at)}</span></div>}
                <div id={'m' + m.id} className={'bubble ' + side + (tail ? ' tail' : '') + (gs ? ' gs' : '') + (m.kind === 'sticker' ? ' stkmsg' : '') + (m.kind === 'gif' ? ' gifb' : '') + (fresh.includes(m.id) ? ' new' : '') + (gone.includes(m.id) ? ' gone' : '') + (sel ? ' selmode' : '') + (sel?.includes(m.id) ? ' selected' : '')}
                  onContextMenu={(e) => (sel ? e.preventDefault() : openMenu(e, m))}
                  onClick={(e) => (sel ? setSel((x) => (x.includes(m.id) ? x.filter((i) => i !== m.id) : [...x, m.id])) : coarse && openMenu(e, m))}>
                  {sel && <span className="chk"><Icon n="check" size={14} /></span>}
                  {isGroup && !own && <div className="who">{m.sender_name}</div>}
                  {m.fwd && <div className="fwdl"><Icon n="forward" size={14} />Переслано от <b className="who">{m.fwd}</b></div>}
                  {m.reply_to && <div className="quote"><b>{m.reply_name || ''}</b><div>{m.reply_name ? m.reply_text : 'Сообщение удалено'}</div></div>}
                  <Body m={m} meId={me.id} onView={setViewer} auto={{ photo: prefs['ap_' + cls0], video: prefs['av_' + cls0], gif: prefs.autoGif }} />
                  {(() => {
                    const timeEl = <span className={'time' + (own && cur.type === 'direct' && read ? ' read' : '')}>{isChannel && <span className="views"><Icon n="eye" size={14} />{m.views || 0}</span>}{m.edited ? 'изм. ' : ''}{hm(m.created_at)}{own && cur.type === 'direct' && <Icon n={read ? 'dcheck' : 'check'} size={15} />}</span>;
                    return m.reactions?.length ? <>{timeEl}<div className="reacts">{m.reactions.map((r) => (
                      <button key={r.emoji} className={'rc' + (r.users.includes(me.id) ? ' mine' : '')} onClick={(e) => { e.stopPropagation(); react(m, r.emoji); }}><Emo e={r.emoji} /><span>{r.users.length}</span></button>))}</div></> : timeEl;
                  })()}
                  {!sel && !isChannel && <button className="qh" title="Реакция" onClick={(e) => { e.stopPropagation(); react(m, '❤️'); }}><Icon n="heart" size={18} /></button>}
                  {!sel && isChannel && <button className="share" title="Переслать" onClick={(e) => { e.stopPropagation(); setFwd([m.id]); }}><Icon n="forward" size={18} /></button>}
                </div></Fragment>); })}
            <div ref={endRef} />
          </div>
          {down && <button className="down" title="Вниз" onClick={() => endRef.current?.scrollIntoView({ behavior: 'smooth' })}><Icon n="down" /></button>}
          {(reply || editing) && (
            <div className="strip"><Icon n={editing ? 'edit' : 'reply'} size={20} />
              <div className="quote"><b>{editing ? 'Редактирование' : reply.sender_name}</b><div>{(editing || reply).text || 'Вложение'}</div></div>
              <button className="ib" onClick={() => { setReply(null); setEditing(null); setText(''); }}><Icon n="close" size={20} /></button></div>)}
          {prefs.stkSuggest && canPost && isOneEmoji(text) && <button className="sugg" onClick={() => { sendMedia('sticker', twemojiUrl(text.trim())); setText(''); }}><img src={twemojiUrl(text.trim())} alt="" /></button>}
          {emoji && canPost && <EmojiPicker onSticker={(u) => sendMedia('sticker', u)} onGif={(u) => sendMedia('gif', u)} onPick={(e) => setText((t) => t + e)}
            onBackspace={() => setText((t) => { const g = [...new Intl.Segmenter().segment(t)]; g.pop(); return g.map((x) => x.segment).join(''); })} />}
          {cur.blocked ? (
            <div className="composer"><div className="pill chanbar"><button className="ghost" onClick={toggleBlock}><Icon n="block" size={20} />Разблокировать</button></div></div>
          ) : !canPost ? (
            <div className="composer"><div className="pill chanbar"><button className="ghost" onClick={() => toggleMute(cur.id)}><Icon n={muted ? 'volume' : 'volumeoff'} size={20} />{muted ? 'Включить звук' : 'Отключить звук'}</button></div></div>
          ) : rec ? (
            <div className="composer"><div className="pill recbar"><span className="dot" /><b>{fmt(secs)}</b><span className="grow" />
              <button className="ghost" onClick={() => stopRec(false)}>Отмена</button></div>
              <button className="fab" title="Отправить" onClick={() => stopRec(true)}><Icon n="send" /></button></div>
          ) : (
            <div className="composer">
              <div className="pill">
                <div className="relw">
                  <button className="ib" title="Прикрепить" onClick={tog('attach')}><Icon n="clip" /></button>
                  {pop === 'attach' && (
                    <div className="pop up attach" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { mediaIn.current.click(); setPop(null); }}><Icon n="image" size={20} />Фото или видео</button>
                      <button onClick={() => { fileIn.current.click(); setPop(null); }}><Icon n="fileic" size={20} />Файл</button>
                      <button onClick={() => { audioIn.current.click(); setPop(null); }}><Icon n="music" size={20} />Музыка</button>
                    </div>)}
                </div>
                <textarea ref={taRef} className="msginput" rows={1} value={text} placeholder={isChannel ? 'Публикация' : 'Сообщение'}
                  onChange={(e) => {
                    setText(prefs.autoText ? e.target.value.replace(/--/g, '—').replace(/<</g, '«').replace(/>>/g, '»') : e.target.value);
                    sock.current.emit('typing', { chatId: cur.id });
                    e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (prefs.sendMode === 'ctrl' ? e.ctrlKey : !e.shiftKey)) { e.preventDefault(); send(); } }} />
                {isChannel && <button className="ib" title={muted ? 'Включить звук' : 'Убрать звук…'} onClick={() => toggleMute(cur.id)}><Icon n={muted ? 'volumeoff' : 'bell'} /></button>}
                <button className="ib" title="Эмодзи" onClick={(e) => { e.stopPropagation(); setEmoji((v) => !v); }}><Icon n="smile" /></button>
                <input ref={mediaIn} type="file" hidden accept="image/*,video/*" onChange={attach} />
                <input ref={fileIn} type="file" hidden onChange={attach} />
                <input ref={audioIn} type="file" hidden accept="audio/*" onChange={attach} />
              </div>
              {text.trim() || editing
                ? <button className="fab" title={editing ? 'Сохранить' : 'Отправить'} onClick={send}><Icon n={editing ? 'check' : 'send'} /></button>
                : <button className="fab" title="Записать голосовое" onClick={startRec}><Icon n="mic" /></button>}
            </div>)}</>)
        : <div className="placeholder"><span>Выберите чат, чтобы начать переписку</span></div>}
      </main>

      {menu && (
        <div className="ctxw" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <div className="rbar">
            {(menu.more ? REACT_ALL : REACT_BASE).map((e) => <button key={e} className={'re' + (myReact(menu.m) === e ? ' on' : '')} onClick={() => react(menu.m, e)}><Emo e={e} /></button>)}
            <button className="ib" title="Ещё" onClick={() => setMenu({ ...menu, more: !menu.more })}><span className="rot" style={{ transform: menu.more ? 'rotate(-90deg)' : 'rotate(90deg)' }}><Icon n="chev" size={18} /></span></button>
          </div>
          <div className="ctx2">
            {canPost && <button onClick={() => { setReply(menu.m); setEditing(null); setMenu(null); }}><Icon n="reply" size={20} />Ответить</button>}
            {menu.m.text && <button onClick={() => { navigator.clipboard?.writeText(menu.m.text); setMenu(null); }}><Icon n="copy" size={20} />Копировать текст</button>}
            {menu.m.sender_id === me.id && menu.m.kind === 'text' && <button onClick={() => { setEditing(menu.m); setReply(null); setText(menu.m.text); setMenu(null); }}><Icon n="edit" size={20} />Изменить</button>}
            {canPost && <button onClick={() => { setPinDlg(menu.m); setPinAll(true); setMenu(null); }}><Icon n="pin" size={20} />Закрепить</button>}
            <button onClick={() => { setFwd([menu.m.id]); setMenu(null); }}><Icon n="forward" size={20} />Переслать</button>
            <button onClick={() => { setSel([menu.m.id]); setMenu(null); }}><Icon n="checkc" size={20} />Выбрать</button>
            <button className="danger" onClick={() => { setDel([menu.m]); setDelAll(false); setMenu(null); }}><Icon n="trash" size={20} />Удалить</button>
          </div>
        </div>)}
      {del && (
        <div className="modal-back" onClick={() => setDel(null)}><div className="dlg" onClick={(e) => e.stopPropagation()}>
          <h2>{del.length > 1 ? `Удалить ${del.length} сообщ.` : 'Удалить сообщение'}</h2>
          <p>{del.length > 1 ? 'Вы точно хотите удалить выбранные сообщения?' : 'Вы точно хотите удалить это сообщение?'}</p>
          {canAll && <label className="checkrow"><input type="checkbox" checked={delAll} onChange={(e) => setDelAll(e.target.checked)} />
            {cur.type === 'direct' ? `Также удалить для ${cur.name}` : isChannel ? 'Удалить у подписчиков' : 'Удалить для всех'}</label>}
          <div className="dbtns"><button className="tbtn" onClick={() => setDel(null)}>Отмена</button><button className="tbtn danger" onClick={confirmDelete}>Удалить</button></div>
        </div></div>)}
      {pinDlg && (
        <div className="modal-back" onClick={() => setPinDlg(null)}><div className="dlg" onClick={(e) => e.stopPropagation()}>
          <h2>Закрепить сообщение</h2><p>Закрепить это сообщение в чате?</p>
          {cur.type === 'direct' && <label className="checkrow"><input type="checkbox" checked={pinAll} onChange={(e) => setPinAll(e.target.checked)} />{`Закрепить у меня и у ${cur.name}`}</label>}
          <div className="dbtns"><button className="tbtn" onClick={() => setPinDlg(null)}>Отмена</button><button className="tbtn" onClick={confirmPin}>Закрепить</button></div>
        </div></div>)}
      {fwd && (
        <div className="modal-back" onClick={() => setFwd(null)}><div className="panel" onClick={(e) => e.stopPropagation()}>
          <h2>Переслать</h2>
          <div className="clist">{chats.filter((c) => c.type !== 'channel' || c.owner_id === me.id).map((c) => (
            <label key={c.id} className="srow click"><input className="cbx" type="checkbox" checked={fwdTo.includes(c.id)} onChange={() => setFwdTo((x) => (x.includes(c.id) ? x.filter((i) => i !== c.id) : [...x, c.id]))} />
              <Ava name={c.name} url={c.avatar} icon={chatIcon(c)} /><div className="smeta"><b className="nm">{c.name}</b></div></label>))}</div>
          <div className="row"><button className="ghost" onClick={() => setFwd(null)}>Отмена</button><button disabled={!fwdTo.length} onClick={doForward}>Переслать</button></div>
        </div></div>)}
      {modal === 'channel' && (
        <div className="modal-back" onClick={() => setModal(null)}><div className="panel" onClick={(e) => e.stopPropagation()}>
          <h2>Создать канал</h2>
          <label>Название<input autoFocus value={form.title} maxLength={64} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label>Описание (необязательно)<input value={form.description} maxLength={200} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label>Ссылка канала<input value={form.username} placeholder="my_channel" onChange={(e) => setForm({ ...form, username: e.target.value })} /><small>Люди найдут канал по @ссылке. От 5 символов: a–z, 0–9, _</small></label>
          {err && <div className="err">{err}</div>}
          <div className="row"><button className="ghost" onClick={() => setModal(null)}>Отмена</button><button onClick={createChannel}>Создать</button></div>
        </div></div>)}
      {modal === 'bug' && (
        <div className="modal-back" onClick={() => setModal(null)}><div className="panel" onClick={(e) => e.stopPropagation()}>
          <h2>Сообщить об ошибке</h2>
          <textarea className="ta" autoFocus rows={5} placeholder="Опишите, что пошло не так" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
          {err && <div className="err">{err}</div>}
          <div className="row"><button className="ghost" onClick={() => setModal(null)}>Отмена</button><button onClick={sendReport}>Отправить</button></div>
        </div></div>)}
      {modal === 'contacts' && (
        <div className="modal-back" onClick={() => setModal(null)}><div className="panel" onClick={(e) => e.stopPropagation()}>
          <h2>Контакты</h2>
          <label className="sbox"><Icon n="search" size={18} /><input autoFocus value={cq} onChange={(e) => setCq(e.target.value)} placeholder="Найти человека" /></label>
          <div className="clist">{(cq.trim() ? cres : chats.filter((c) => c.type === 'direct').map((c) => ({ id: c.peer_id, name: c.name, username: c.username, avatar: c.avatar }))).map((u) => (
            <div key={u.id} className="mrow" onClick={() => openUser(u)}><Ava name={u.name} url={u.avatar} /><div><b>{u.name}</b><small>@{u.username}</small></div></div>))}
            {!cq.trim() && !chats.some((c) => c.type === 'direct') && <div className="sub">Пока нет контактов. Найдите человека через поиск.</div>}</div>
        </div></div>)}
      {modal === 'edit' && <EditProfile me={me} onSave={onMe} onClose={() => setModal(null)} />}
      <CallUI c={calls} />
      {side === 'contact' && cur?.type === 'direct' && <ContactEdit chat={cur} muted={muted} onToggleMute={() => { setMute(cur.id, muted ? 0 : Infinity); bump(); }} onClose={() => setSide(null)} onSaved={loadChats} onDelete={() => leave('Удалить контакт')} />}
      {info && cur && <Info chat={cur} status={status} meId={me.id} muted={muted} onMute={() => { setMute(cur.id, muted ? 0 : Infinity); bump(); }} onClose={() => setInfo(false)} onView={setViewer} onOpenUser={(u) => { setInfo(false); openUser(u); }} />}
      {viewer && (
        <div className="modal-back" onClick={() => setViewer(null)}>
          {viewer.kind === 'video' ? <video className="big" src={viewer.file_url} controls autoPlay onClick={(e) => e.stopPropagation()} /> : <img className="big" src={viewer.file_url} alt="" />}
        </div>)}
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
