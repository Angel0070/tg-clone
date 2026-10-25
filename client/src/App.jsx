import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api, getToken } from './api.js';

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

function Chat({ me }) {
  const [chats, setChats] = useState([]); const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]); const [text, setText] = useState('');
  const [q, setQ] = useState(''); const [found, setFound] = useState([]);
  const [typing, setTyping] = useState(false); const [reply, setReply] = useState(null);
  const [editing, setEditing] = useState(null); const [group, setGroup] = useState(null);
  const [err, setErr] = useState(''); const [menu, setMenu] = useState(null);
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  useEffect(() => {
    const close = (e) => { if (e.type === 'click' || e.key === 'Escape') setMenu(null); };
    window.addEventListener('click', close); window.addEventListener('keydown', close);
    return () => { window.removeEventListener('click', close); window.removeEventListener('keydown', close); };
  }, []);
  const openMenu = (e, m) => {
    if (m.deleted) return;
    e.preventDefault(); e.stopPropagation();
    setMenu({ m, x: Math.max(8, Math.min(e.clientX, window.innerWidth - 220)), y: Math.max(8, Math.min(e.clientY, window.innerHeight - 200)) });
  };
  const sock = useRef(null); const activeRef = useRef(null); const endRef = useRef(null);
  activeRef.current = active;

  const loadChats = () => api('/chats').then(setChats);
  useEffect(() => {
    loadChats();
    const s = io({ auth: { token: getToken() } }); sock.current = s;
    s.on('message', (m) => { if (m.chat_id === activeRef.current?.id) setMsgs((x) => [...x, m]); loadChats(); });
    s.on('message:update', (m) => { setMsgs((x) => x.map((y) => (y.id === m.id ? m : y))); loadChats(); });
    s.on('chats', loadChats);
    let t; s.on('typing', ({ chatId }) => {
      if (chatId === activeRef.current?.id) { setTyping(true); clearTimeout(t); t = setTimeout(() => setTyping(false), 2000); } });
    return () => s.disconnect();
  }, []);
  useEffect(() => { setReply(null); setEditing(null); setText(''); if (active) api(`/chats/${active.id}/messages`).then(setMsgs); }, [active?.id]);
  useEffect(() => { endRef.current?.scrollIntoView(); }, [msgs]);
  useEffect(() => {
    if (!q.trim()) return setFound([]);
    const h = setTimeout(() => api('/users/search?q=' + encodeURIComponent(q)).then(setFound), 250);
    return () => clearTimeout(h);
  }, [q]);

  const open = (c) => setActive({ id: c.id, name: c.name, username: c.username, type: c.type, members_count: c.members_count });
  const openUser = async (u) => {
    const { id } = await api('/chats/direct', { userId: u.id });
    await loadChats(); setQ(''); setActive({ id, name: u.name, username: u.username, type: 'direct' });
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
  const time = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isGroup = active?.type === 'group';

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
              <div className="ava">{u.name[0]}</div><div><div className="nm">{u.name}</div><div className="sub">@{u.username}</div></div></div>))
            : <div className="empty">Никого не найдено</div>)
          : chats.length ? chats.map((c) => (
            <div key={c.id} className={'item' + (active?.id === c.id ? ' sel' : '')} onClick={() => open(c)}>
              <div className="ava">{c.name[0]}</div>
              <div className="meta"><div className="nm">{c.name}</div><div className="sub">{c.last_text || 'Нет сообщений'}</div></div></div>))
          : <div className="empty">Найдите собеседника через поиск или создайте группу кнопкой ＋</div>}
        </div>
        <div className="me">{me.name} · @{me.username}</div>
      </aside>
      <main>
        {active ? (<>
          <header><button className="back" onClick={() => setActive(null)}>‹</button>
            <div><div className="nm">{active.name}</div>
              <div className="sub">{typing ? 'печатает…' : isGroup ? `${active.members_count} участн.` : '@' + active.username}</div></div></header>
          <div className="msgs">
            {msgs.map((m) => { const own = m.sender_id === me.id; return (
              <div key={m.id} className={'bubble ' + (own ? 'out' : 'in')} onContextMenu={(e) => openMenu(e, m)} onClick={(e) => coarse && openMenu(e, m)}>
                {isGroup && !own && <div className="who">{m.sender_name}</div>}
                {m.reply_to && <div className="quote"><b>{m.reply_name}</b><div>{m.reply_text || 'Сообщение удалено'}</div></div>}
                {m.deleted ? <i className="sub">Сообщение удалено</i> : m.text}
                <span className="time">{m.edited && !m.deleted ? 'изменено ' : ''}{time(m.created_at)}</span>
              </div>); })}
            <div ref={endRef} />
          </div>
          {(reply || editing) && (
            <div className="strip"><div className="quote"><b>{editing ? 'Редактирование' : 'Ответ: ' + reply.sender_name}</b><div>{(editing || reply).text}</div></div>
              <button className="ghost" onClick={() => { setReply(null); setEditing(null); setText(''); }}>✕</button></div>)}
          <div className="composer">
            <input value={text} placeholder="Написать сообщение…"
              onChange={(e) => { setText(e.target.value); sock.current.emit('typing', { chatId: active.id }); }}
              onKeyDown={(e) => e.key === 'Enter' && send()} />
            <button onClick={send}>{editing ? 'Сохранить' : 'Отправить'}</button></div></>)
        : <div className="placeholder">Выберите чат, чтобы начать переписку</div>}
      </main>
      {menu && (
        <div className="ctx" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { setReply(menu.m); setEditing(null); setMenu(null); }}>Ответить</button>
          <button onClick={() => { navigator.clipboard?.writeText(menu.m.text); setMenu(null); }}>Копировать текст</button>
          {menu.m.sender_id === me.id && <button onClick={() => { setEditing(menu.m); setReply(null); setText(menu.m.text); setMenu(null); }}>Изменить</button>}
          {menu.m.sender_id === me.id && <button className="danger" onClick={() => { sock.current.emit('delete', { id: menu.m.id }); setMenu(null); }}>Удалить</button>}
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
  return me ? <Chat me={me} /> : <Login onDone={setMe} />;
}
