import { useEffect, useState } from 'react';
import { api } from './api.js';
import { Icon } from './icons.jsx';
import { Ava, fmt, dd, size, ext, bday } from './utils.jsx';
import { Voice } from './voice.jsx';

/* ---------- Панель «Информация» ---------- */
export const TABS = [['media', 'Медиа'], ['files', 'Файлы'], ['links', 'Ссылки'], ['voice', 'Голос']];
export function Info({ chat, status, meId, onClose, onView, onOpenUser }) {
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
          <div className="sub">{data?.type === 'group' ? `${data.members.length} участн.` : data?.type === 'channel' ? `${data.subscribers} подписчиков` : status}</div></div>
        {u && <div className="icard">
          <div><b>{u.login}</b><small>{u.login.includes('@') ? 'Email' : 'Телефон'}</small></div>
          {u.bio && <div><b>{u.bio}</b><small>О себе</small></div>}
          {u.birthday && <div><b>{bday(u.birthday)}</b><small>День рождения</small></div>}
          <div><b>@{u.username}</b><small>Имя пользователя</small></div></div>}
        {data?.type === 'group' && <div className="icard">{data.members.map((x) => (
          <div key={x.id} className="mrow" onClick={() => x.id !== meId && onOpenUser(x)}><Ava name={x.name} url={x.avatar} />
            <div><b>{x.name}{x.id === meId ? ' (вы)' : ''}</b><small>@{x.username}</small></div></div>))}</div>}
        {data?.type === 'channel' && <div className="icard">{data.description && <div><b>{data.description}</b><small>Описание</small></div>}<div><b>@{data.username}</b><small>Ссылка</small></div></div>}
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

