import { useState } from 'react';
import { Icon } from './icons.jsx';
import { Ava, bday } from './utils.jsx';
import { prefs, savePref } from './prefs.js';

const Switch = ({ on, onChange }) => <button className={'sw' + (on ? ' on' : '')} role="switch" aria-checked={on} onClick={() => onChange(!on)}><i /></button>;
const Row = ({ ico, color, title, sub, onClick, right }) => (
  <div className={'srow' + (onClick ? ' click' : '')} onClick={onClick}>
    {ico && <span className="sico" style={{ background: color }}><Icon n={ico} size={20} /></span>}
    <div className="smeta"><b>{title}</b>{sub && <small>{sub}</small>}</div>{right}</div>);
const logout = () => { localStorage.removeItem('token'); location.reload(); };
const TITLES = { main: 'Настройки', general: 'Общие настройки', notif: 'Уведомления', anim: 'Анимации и скорость', lang: 'Язык', sessions: 'Активные сеансы' };

export default function SettingsPanel({ me, channel, onClose, onEdit, onOpenChannel, onChange }) {
  const [page, setPage] = useState('main'); const [menu, setMenu] = useState(false); const [, force] = useState(0);
  const set = (k, v) => { savePref(k, v); force((x) => x + 1); onChange(); };
  const back = () => (page === 'main' ? onClose() : setPage('main'));
  const toggleNotify = async (v) => {
    if (v && 'Notification' in window && Notification.permission !== 'granted') { if ((await Notification.requestPermission()) !== 'granted') return; }
    set('notify', v);
  };
  return (
    <div className="spanel" onClick={() => setMenu(false)}>
      <div className="shead">
        <button className="ib" onClick={back}><Icon n="back" /></button><b>{TITLES[page]}</b><span className="grow" />
        {page === 'main' && <>
          <button className="ib" title="Изменить профиль" onClick={onEdit}><Icon n="edit" /></button>
          <div className="relw"><button className="ib" onClick={(e) => { e.stopPropagation(); setMenu(!menu); }}><Icon n="more" /></button>
            {menu && <div className="pop right" onClick={(e) => e.stopPropagation()}><button className="danger" onClick={logout}>Выйти из аккаунта</button></div>}</div></>}
      </div>
      <div className="sbody">
        {page === 'main' && <>
          <div className="sprof"><Ava name={me.name} url={me.avatar} /><div className="nm bignm">{me.name}</div><div className="sub live">в сети</div></div>
          {channel && <>
            <div className="shl"><span>Канал</span><span>{channel.members_count} подписчиков</span></div>
            <div className="icard click" onClick={onOpenChannel}><div className="mrow"><Ava name={channel.name} icon="megaphone" /><div><b>{channel.name}</b><small>{channel.last_text || 'Нет публикаций'}</small></div></div></div></>}
          <div className="icard">
            <Row ico="user" color="#34c759" title={me.login} sub={me.login.includes('@') ? 'Email' : 'Телефон'} />
            <Row ico="link" color="#3390ec" title={'@' + me.username} sub="Имя пользователя" />
            {me.bio && <Row ico="help" color="#8e8e93" title={me.bio} sub="О себе" />}
            {me.birthday && <Row ico="clock" color="#8e63e6" title={bday(me.birthday)} sub="День рождения" />}
          </div>
          <div className="icard">
            <Row ico="user" color="#3390ec" title="Аккаунт" sub="Имя пользователя, «О себе», день рождения" onClick={onEdit} />
            <Row ico="sliders" color="#ff9500" title="Общие настройки" sub="Тема, размер текста" onClick={() => setPage('general')} />
            <Row ico="bell" color="#ff3b30" title="Уведомления" sub="Звуки, всплывающие уведомления" onClick={() => setPage('notif')} />
            <Row ico="bolt" color="#8e63e6" title="Анимации и скорость" sub="Анимации интерфейса" onClick={() => setPage('anim')} />
            <Row ico="globe" color="#7c5cff" title="Язык" sub="Русский" onClick={() => setPage('lang')} />
            <Row ico="devices" color="#3aa0f0" title="Активные сеансы" sub="Это устройство, выход" onClick={() => setPage('sessions')} />
          </div></>}
        {page === 'general' && <>
          <div className="icard">{[['auto', 'Как в системе'], ['light', 'Светлая тема'], ['dark', 'Тёмная тема']].map(([k, l]) => (
            <Row key={k} title={l} onClick={() => set('theme', k)} right={prefs.theme === k ? <Icon n="check" /> : null} />))}</div>
          <div className="icard"><div className="srow col"><b>Размер текста: {prefs.fs} px</b>
            <input type="range" min="12" max="20" value={prefs.fs} onChange={(e) => set('fs', +e.target.value)} /></div></div></>}
        {page === 'notif' && <div className="icard">
          <Row title="Звук сообщений" sub="Сигнал при новом сообщении" right={<Switch on={prefs.sound} onChange={(v) => set('sound', v)} />} />
          <Row title="Всплывающие уведомления" sub="Когда вкладка не активна" right={<Switch on={prefs.notify} onChange={toggleNotify} />} /></div>}
        {page === 'anim' && <div className="icard"><Row title="Эффекты интерфейса" sub="Плавные переходы и анимации" right={<Switch on={prefs.fx} onChange={(v) => set('fx', v)} />} /></div>}
        {page === 'lang' && <div className="icard"><Row title="Русский" sub="Другие языки пока недоступны" right={<Icon n="check" />} /></div>}
        {page === 'sessions' && <div className="icard">
          <Row ico="devices" color="#3aa0f0" title="Этот браузер" sub={'Сейчас в сети · ' + (navigator.platform || 'устройство')} />
          <div className="srow"><button className="ghost danger-t" onClick={logout}>Выйти из аккаунта</button></div></div>}
      </div>
    </div>);
}
