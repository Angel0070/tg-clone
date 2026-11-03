import { useEffect, useState } from 'react';
import { api } from './api.js';
import { Icon } from './icons.jsx';
import { Ava, dd, size, ext, bday } from './utils.jsx';
import { Voice } from './voice.jsx';

const TABS = [['media', 'Медиа'], ['files', 'Файлы'], ['links', 'Ссылки'], ['music', 'Музыка'], ['voice', 'Голос']];
const IR = ({ ico, color, title, sub, right, onClick }) => (
  <div className={'irow' + (onClick ? ' click' : '')} onClick={onClick}><span className="sico" style={{ background: color }}><Icon n={ico} size={20} /></span>
    <div className="smeta"><b>{title}</b>{sub && <small>{sub}</small>}</div>{right}</div>);

export function Info({ chat, status, meId, muted, onMute, onClose, onView, onOpenUser }) {
  const [data, setData] = useState(null); const [tab, setTab] = useState('media'); const [items, setItems] = useState([]); const [subs, setSubs] = useState(false);
  useEffect(() => { api(`/chats/${chat.id}/info`).then(setData); }, [chat.id]);
  useEffect(() => { setItems([]); api(`/chats/${chat.id}/shared?type=${tab}`).then(setItems); }, [chat.id, tab]);
  const u = data?.user; const type = data?.type || chat.type;
  const links = items.flatMap((m) => (m.text.match(/https?:\/\/[^\s<]+/g) || []).map((url) => ({ url, m })));
  const host = (url) => { try { return new URL(url).hostname; } catch { return url; } };
  const bell = <IR key="bell" ico="bell" color="#ff3b30" title="Уведомления" right={<button className={'sw' + (!muted ? ' on' : '')} role="switch" aria-checked={!muted} onClick={onMute}><i /></button>} />;
  return (
    <div className="info">
      <div className="ihead"><button className="ib" onClick={onClose}><Icon n="close" /></button><b>{type === 'channel' ? 'О канале' : type === 'group' ? 'О группе' : 'Информация'}</b></div>
      <div className="iscroll">
        <div className="iprof"><Ava name={chat.name} url={u?.avatar || chat.avatar} icon={chat.type === 'saved' ? 'bookmark' : type === 'channel' ? 'megaphone' : null} />
          <div className="nm bignm">{chat.name}</div>
          <div className="sub">{type === 'group' ? `${data.members.length} участн.` : type === 'channel' ? `${data.subscribers} подписчиков` : status}</div></div>
        {u && <div className="icard">
          {u.login && <IR ico="phone" color="#34c759" title={u.login} sub={u.login.includes('@') ? 'Email' : 'Телефон'} />}
          {u.bio && <IR ico="info" color="#8e8e93" title={u.bio} sub="О себе" />}
          {u.birthday && <IR ico="cake" color="#8e63e6" title={bday(u.birthday)} sub="День рождения" />}
          <IR ico="link" color="#ff9500" title={'@' + u.username} sub="Имя пользователя" />{bell}</div>}
        {type === 'channel' && data && <div className="icard">
          {data.description && <IR ico="info" color="#8e8e93" title={data.description} sub="Описание" />}
          <IR ico="link" color="#ff9500" title={'@' + data.username} sub="Ссылка" right={<button className="ib" title="Копировать" onClick={() => navigator.clipboard?.writeText('@' + data.username)}><Icon n="copy" size={18} /></button>} />
          {bell}
          <IR ico="users" color="#34c759" title="Подписчики" sub={String(data.subscribers)} onClick={data.members ? () => setSubs((v) => !v) : undefined} />
          {subs && data.members?.map((x) => <div key={x.id} className="mrow subrow"><Ava name={x.name} url={x.avatar} /><div><b>{x.name}</b><small>@{x.username}</small></div></div>)}</div>}
        {type === 'group' && <div className="icard">{bell}{data.members.map((x) => (
          <div key={x.id} className="mrow" onClick={() => x.id !== meId && onOpenUser(x)}><Ava name={x.name} url={x.avatar} />
            <div><b>{x.name}{x.id === meId ? ' (вы)' : ''}</b><small>@{x.username}</small></div></div>))}</div>}
        {type === 'saved' && null}
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
          {tab === 'music' && items.map((m) => (
            <div key={m.id} className="vrow"><div><b>{m.file_name}</b><small>{dd(m.created_at)}</small></div><audio controls preload="none" src={m.file_url} /></div>))}
          {tab === 'voice' && items.map((m) => (
            <div key={m.id} className="vrow"><div><b>{m.sender_id === meId ? 'Вы' : m.sender_name}</b><small>{dd(m.created_at)}</small></div><Voice m={m} /></div>))}
          {!(tab === 'links' ? links.length : items.length) && <div className="sub">Пока ничего нет</div>}
        </div>
      </div>
    </div>);
}
