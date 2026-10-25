import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api, getToken, upload } from './api.js';

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
      <div className="logo">✈</div><h1>Вход в Telegram</h1>
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

const EMOJI = '😀 😃 😄 😁 😆 😅 😂 🤣 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤔 😐 😏 😒 🙄 😬 😌 😔 😴 😷 🤒 🥵 🥶 🤯 🤠 😎 🤓 🧐 😕 😟 🙁 😮 😲 😳 🥺 😢 😭 😱 😖 😞 😩 😫 😤 😡 🤬 😈 💀 💩 🤡 👻 👽 🤖 👍 👎 👌 🤞 🤟 🤘 👋 🙏 💪 👏 🙌 🤝 ❤️ 🧡 💛 💚 💙 💜 🖤 💔 🔥 ✨ ⭐ 🎉 🎂 🎁 🍕 🍔 🍟 🍺 ☕ 🐶 🐱 🦊 🐻 🐼 🐸 🐵 🙈'.split(' ');
const fmt = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
const Ava = ({ name, url }) => (url ? <img className="ava" src={url} alt="" /> : <div className="ava">{(name || '?')[0]}</div>);

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
      <label className="avabtn"><Ava name={f.name} url={f.avatar} />
        <input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={pick} /><span>Сменить фото</span></label>
      <label>Имя<input value={f.name} onChange={set('name')} maxLength={64} /></label>
      <label>О себе<input value={f.bio} onChange={set('bio')} maxLength={70} /><small>{f.bio.length} / 70</small></label>
      <label>День рождения<input type="date" value={f.birthday} onChange={set('birthday')} /></label>
      <label>Имя пользователя<input value={f.username} onChange={set('username')} /><small>Только a–z, 0–9 и _, минимум 5 символов</small></label>
      <div className="sub">Вы вошли как {me.login}</div>
      {err && <div className="err">{err}</div>}
      <div className="row"><button onClick={save}>Сохранить</button><button className="ghost" onClick={onClose}>Отмена</button>
        <button className="ghost danger-t" onClick={() => { localStorage.removeItem('token'); location.reload(); }}>Выйти</button></div>
    </div></div>);
}

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
  const sock = useRef(null); const activeRef = useRef(null); const endRef = useRef(null); const recRef = useRef(null);
  activeRef.current = active;
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  useEffect(() => {
    const close = (e) => { if (e.type === 'click' || e.key === 'Escape') setMenu(null); };
    window.addEventListener('click', close); window.addEventListener('keydown', close);
    return () => { window.removeEventListener('click', close); window.removeEventListener('keydown', close); };
  }, []);
  useEffect(() => {
    if (!rec) return;
    setSecs(0); const i = setInterval(() => setSecs((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, [rec]);
  const openMenu = (e, m) => {
    e.preventDefault(); e.stopPropagation();
    setMenu({ m, x: Math.max(8, Math.min(e.clientX, window.innerWidth - 220)), y: Math.max(8, Math.min(e.clientY, window.innerHeight - 200)) });
  };

  const loadChats = () => api('/chats').then(setChats);
  useEffect(() => {
    loadChats();
    const s = io({ auth: { token: getToken() } }); sock.current = s;
    s.on('message', (m) => { if (m.chat_id === activeRef.current?.id) setMsgs((x) => [...x, m]); loadChats(); });
    s.on('message:update', (m) => { setMsgs((x) => x.map((y) => (y.id === m.id ? m : y))); loadChats(); });
    s.on('message:delete', ({ id }) => { setMsgs((x) => x.filter((y) => y.id !== id)); loadChats(); });
    s.on('chats', loadChats);
    let t; s.on('typing', ({ chatId }) => {
      if (chatId === activeRef.current?.id) { setTyping(true); clearTimeout(t); t = setTimeout(() => setTyping(false), 2000); } });
    return () => s.disconnect();
  }, []);
  useEffect(() => { setReply(null); setEditing(null); setText(''); setEmoji(false); if (active) api(`/chats/${active.id}/messages`).then(setMsgs); }, [active?.id]);
  useEffect(() => { endRef.current?.scrollIntoView(); }, [msgs]);
  useEffect(() => {
    if (!q.trim()) return setFound([]);
    const h = setTimeout(() => api('/users/search?q=' + encodeURIComponent(q)).then(setFound), 250);
    return () => clearTimeout(h);
  }, [q]);

  const open = (c) => setActive({ id: c.id, name: c.name, username: c.username, avatar: c.avatar, type: c.type, members_count: c.members_count });
  const openUser = async (u) => {
    const { id } = await api('/chats/direct', { userId: u.id });
    await loadChats(); setQ(''); setActive({ id, name: u.name, username: u.username, avatar: u.avatar, type: 'direct' });
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
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream); const chunks = []; const t0 = Date.now();
      mr.chatId = active.id; mr.replyTo = reply?.id;
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!mr.wantSend) return;
        try {
          const fileUrl = await upload(new Blob(chunks, { type: mr.mimeType }));
          sock.current.emit('message', { chatId: mr.chatId, kind: 'voice', fileUrl, duration: Math.round((Date.now() - t0) / 1000), replyTo: mr.replyTo });
        } catch (e) { alert(e.message); }
      };
      mr.start(); recRef.current = mr; setRec(true);
    } catch { alert('Нет доступа к микрофону. Разрешите его в настройках браузера.'); }
  };
  const stopRec = (wantSend) => { const mr = recRef.current; if (!mr) return; mr.wantSend = wantSend; mr.stop(); recRef.current = null; setRec(false); if (wantSend) setReply(null); };
  const confirmDelete = () => { sock.current.emit('delete', { id: del.id, forAll: delAll }); setDel(null); setDelAll(false); };
  const time = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isGroup = active?.type === 'group';
  const canAll = del && (del.sender_id === me.id || active.type === 'direct');

  return (
    <div className={'app' + (active ? ' has-active' : '')}>
      <aside>
        <div className="search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по имени или @username" />
          {!group && <button className="plus" title="Новая группа" onClick={() => setGroup({ title: '', picked: [] })}>＋</button>}
        </div>
        {group && (
          <div className="gpanel">
            <input value={group.title} onChange={(e) => setGroup({ ...group, title: e.target.value })} placeholder="Название группы" />
            <div className="sub">{group.picked.length ? 'Участники: ' + group.picked.map((p) => p.name).join(', ') : 'Найдите людей через поиск и нажмите на них'}</div>
            {err && <div className="err">{err}</div>}
            <div className="row"><button onClick={createGroup}>Создать группу</button><button className="ghost" onClick={() => { setGroup(null); setErr(''); }}>Отмена</button></div>
          </div>)}
        <div className="list">
          {q.trim() ? (found.length ? found.map((u) => (
            <div key={u.id} className={'item' + (group?.picked.some((p) => p.id === u.id) ? ' sel' : '')} onClick={() => (group ? togglePick(u) : openUser(u))}>
              <Ava name={u.name} url={u.avatar} /><div><div className="nm">{u.name}</div><div className="sub">@{u.username}</div></div></div>))
            : <div className="empty">Никого не найдено</div>)
          : chats.length ? chats.map((c) => (
            <div key={c.id} className={'item' + (active?.id === c.id ? ' sel' : '')} onClick={() => open(c)}>
              <Ava name={c.name} url={c.avatar} />
              <div className="meta"><div className="nm">{c.name}</div><div className="sub">{c.last_text || 'Нет сообщений'}</div></div></div>))
          : <div className="empty">Найдите собеседника через поиск или создайте группу кнопкой ＋</div>}
        </div>
        <div className="me" onClick={() => setSettings(true)} title="Настройки профиля"><Ava name={me.name} url={me.avatar} /><div><div className="nm">{me.name}</div><div className="sub">@{me.username} · настройки</div></div></div>
      </aside>
      <main>
        {active ? (<>
          <header><button className="back" onClick={() => setActive(null)}>‹</button><Ava name={active.name} url={active.avatar} />
            <div><div className="nm">{active.name}</div>
              <div className="sub">{typing ? 'печатает…' : isGroup ? `${active.members_count} участн.` : '@' + active.username}</div></div></header>
          <div className="msgs">
            {msgs.map((m) => { const own = m.sender_id === me.id; return (
              <div key={m.id} className={'bubble ' + (own ? 'out' : 'in')} onContextMenu={(e) => openMenu(e, m)} onClick={(e) => coarse && openMenu(e, m)}>
                {isGroup && !own && <div className="who">{m.sender_name}</div>}
                {m.reply_to && <div className="quote"><b>{m.reply_name || ''}</b><div>{m.reply_name ? m.reply_text || 'Голосовое сообщение' : 'Сообщение удалено'}</div></div>}
                {m.kind === 'voice' ? <audio controls preload="metadata" src={m.file_url} /> : m.text}
                <span className="time">{m.edited ? 'изменено ' : ''}{m.kind === 'voice' ? fmt(m.duration) + ' · ' : ''}{time(m.created_at)}</span>
              </div>); })}
            <div ref={endRef} />
          </div>
          {(reply || editing) && (
            <div className="strip"><div className="quote"><b>{editing ? 'Редактирование' : 'Ответ: ' + reply.sender_name}</b><div>{(editing || reply).text || 'Голосовое сообщение'}</div></div>
              <button className="ghost" onClick={() => { setReply(null); setEditing(null); setText(''); }}>✕</button></div>)}
          {emoji && <div className="emoji">{EMOJI.map((e) => <button key={e} onClick={() => setText((t) => t + e)}>{e}</button>)}</div>}
          {rec ? (
            <div className="composer"><span className="dot" /><b>{fmt(secs)}</b><span className="grow" />
              <button className="ghost" onClick={() => stopRec(false)}>Отмена</button><button onClick={() => stopRec(true)}>Отправить</button></div>
          ) : (
            <div className="composer">
              <button className="ghost icon" title="Эмодзи" onClick={() => setEmoji((v) => !v)}>😊</button>
              <input value={text} placeholder="Написать сообщение…"
                onChange={(e) => { setText(e.target.value); sock.current.emit('typing', { chatId: active.id }); }}
                onKeyDown={(e) => e.key === 'Enter' && send()} />
              {text.trim() || editing ? <button onClick={send}>{editing ? 'Сохранить' : 'Отправить'}</button>
                : <button className="icon" title="Записать голосовое" onClick={startRec}>🎤</button>}
            </div>)}</>)
        : <div className="placeholder">Выберите чат, чтобы начать переписку</div>}
      </main>
      {menu && (
        <div className="ctx" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { setReply(menu.m); setEditing(null); setMenu(null); }}>Ответить</button>
          {menu.m.kind !== 'voice' && <button onClick={() => { navigator.clipboard?.writeText(menu.m.text); setMenu(null); }}>Копировать текст</button>}
          {menu.m.sender_id === me.id && menu.m.kind !== 'voice' && <button onClick={() => { setEditing(menu.m); setReply(null); setText(menu.m.text); setMenu(null); }}>Изменить</button>}
          <button className="danger" onClick={() => { setDel(menu.m); setDelAll(false); setMenu(null); }}>Удалить</button>
        </div>)}
      {del && (
        <div className="modal-back" onClick={() => setDel(null)}><div className="panel" onClick={(e) => e.stopPropagation()}>
          <h2>Удалить сообщение</h2><div>Вы точно хотите удалить это сообщение?</div>
          {canAll && <label className="checkrow"><input type="checkbox" checked={delAll} onChange={(e) => setDelAll(e.target.checked)} />
            {active.type === 'direct' ? `Также удалить для ${active.name}` : 'Удалить для всех'}</label>}
          <div className="row"><button className="ghost" onClick={() => setDel(null)}>Отмена</button><button className="ghost danger-t" onClick={confirmDelete}>Удалить</button></div>
        </div></div>)}
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
