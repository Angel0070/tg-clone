import { useEffect, useState } from 'react';
import { api, upload } from './api.js';
import { Icon } from './icons.jsx';
import { Ava, bday, dd } from './utils.jsx';
import { prefs, savePref } from './prefs.js';
import { LANGS, LANG } from './i18n.js';

const logout = () => { localStorage.removeItem('token'); location.reload(); };
const ipName = (ip) => (!ip ? '' : /^(::1|(::ffff:)?127\.0\.0\.1)$/.test(ip) ? 'localhost' : ip.replace('::ffff:', ''));
const WALLS = ['#a1c4fd,#c2e9fb', '#fbc2eb,#a6c1ee', '#84fab0,#8fd3f4', '#fccb90,#d57eeb', '#f6d365,#fda085', '#667eea,#764ba2', '#43e97b,#38f9d7', '#fa709a,#fee140', '#30cfd0,#330867', '#232526,#414345', '#0f2027,#2c5364', '#1a1a2e,#6a3093'].map((c) => `linear-gradient(135deg,${c})`);
const KINDS = [['unread', 'Новые', 'Чаты с новыми сообщениями.'], ['direct', 'Личные', 'Сообщения из личных чатов.'], ['group', 'Группы', 'Сообщения из групп.'], ['channel', 'Каналы', 'Сообщения из каналов.']];
const PRIV = [['p_login', 'Кто видит мой номер телефона?'], ['p_seen', 'Кто видит время моего последнего захода?'], ['p_photo', 'Кто видит фото в моём профиле?'], ['p_bio', 'О себе'], ['p_birthday', 'День рождения'], ['p_groups', 'Кто может добавлять меня в группы?']];
const T3 = [['direct', 'Личные чаты'], ['group', 'Группы'], ['channel', 'Каналы']];
const TITLES = { main: 'Настройки', general: 'Основные', wall: 'Обои для чатов', notif: 'Уведомления', privacy: 'Конфиденциальность', blocked: 'Чёрный список', data: 'Данные и память',
  folders: 'Папки с чатами', anim: 'Анимации и скорость', stickers: 'Стикеры и эмодзи', lang: 'Язык', sessions: 'Активные сеансы' };
const PARENT = { wall: 'general', blocked: 'privacy' };
const ANIM = [{ fx: false }, { fx: true, fxSend: true, fxDel: true, fxMenu: true, fxBlur: false, fxPanel: true, fxChat: true, fxMedia: false },
  { fx: true, fxSend: true, fxDel: true, fxMenu: true, fxBlur: true, fxPanel: true, fxChat: true, fxMedia: true }];

const Row = ({ ico, color, title, sub, onClick, right, danger }) => (
  <div className={'srow' + (onClick ? ' click' : '') + (danger ? ' danger-t' : '')} onClick={onClick}>
    {ico && <span className="sico" style={{ background: color }}><Icon n={ico} size={20} /></span>}
    <div className="smeta"><b>{title}</b>{sub && <small>{sub}</small>}</div>{right}</div>);

function FolderEdit({ folder, chats, onSave, onClose }) {
  const [name, setName] = useState(folder?.name || ''); const [ids, setIds] = useState(folder?.chatIds || []);
  const tog = (id) => setIds((x) => (x.includes(id) ? x.filter((i) => i !== id) : [...x, id]));
  return (
    <div className="modal-back" onClick={onClose}><div className="panel" onClick={(e) => e.stopPropagation()}>
      <h2>{folder ? 'Изменить папку' : 'Новая папка'}</h2>
      <label>Название папки<input value={name} maxLength={24} autoFocus onChange={(e) => setName(e.target.value)} /></label>
      <div className="shl"><span>Выберите чаты</span></div>
      <div className="clist">{chats.map((c) => (
        <label key={c.id} className="srow click"><input className="cbx" type="checkbox" checked={ids.includes(c.id)} onChange={() => tog(c.id)} />
          <Ava name={c.name} url={c.avatar} icon={c.type === 'saved' ? 'bookmark' : null} /><div className="smeta"><b className="nm">{c.name}</b></div></label>))}</div>
      <div className="row"><button className="ghost" onClick={onClose}>Отмена</button>
        <button disabled={!name.trim()} onClick={() => onSave({ id: folder?.id || 'f' + Date.now(), name: name.trim(), chatIds: ids })}>Сохранить</button></div>
    </div></div>);
}

export default function SettingsPanel({ me, channel, chats, onClose, onEdit, onOpenChannel, onChange }) {
  const [page, setPage] = useState('main'); const [menu, setMenu] = useState(false); const [, force] = useState(0);
  const [priv, setPriv] = useState(null); const [blocks, setBlocks] = useState(null); const [ses, setSes] = useState(null);
  const [mine, setMine] = useState([]); const [fe, setFe] = useState(null);
  const set = (k, v) => { savePref(k, v); force((x) => x + 1); onChange(); };
  const loadSes = () => api('/sessions').then(setSes).catch(() => {});
  useEffect(() => {
    if (page === 'privacy' || page === 'blocked') { api('/privacy').then(setPriv).catch(() => {}); api('/blocks').then(setBlocks).catch(() => {}); }
    if (page === 'sessions') loadSes();
    if (page === 'stickers') api('/stickers').then(setMine).catch(() => {});
  }, [page]);

  const chk = (id, label, sub) => (
    <label key={id} className="srow click"><input className="cbx" type="checkbox" checked={!!prefs[id]} onChange={(e) => set(id, e.target.checked)} />
      <div className="smeta"><b>{label}</b>{sub && <small>{prefs[id] ? 'Вкл.' : 'Выкл.'}</small>}</div></label>);
  const rad = (id, value, label, sub) => (
    <label key={String(value)} className="srow click"><input className="cbx" type="radio" name={id} checked={prefs[id] === value} onChange={() => set(id, value)} />
      <div className="smeta"><b>{label}</b>{sub && <small>{sub}</small>}</div></label>);
  const rng = (id, label, min, max) => (
    <div key={id} className="srow col"><div className="rline"><b>{label}</b><span>{prefs[id]}</span></div>
      <input type="range" min={min} max={max} value={prefs[id]} onChange={(e) => set(id, +e.target.value)} /></div>);
  const sec = (h, ...kids) => <div key={h}><div className="shl"><span>{h}</span></div><div className="icard">{kids}</div></div>;
  const nav = (ico, color, title, sub, to) => <Row key={to} ico={ico} color={color} title={title} sub={sub} onClick={() => setPage(to)} />;

  const w = prefs.wall; const setWall = (patch) => set('wall', { ...w, ...patch });
  const pickWall = async (e) => { const f = e.target.files[0]; if (!f) return; try { setWall({ type: 'image', value: await upload(f) }); } catch (x) { alert(x.message); } };
  const saveFolder = (f) => { set('folders', prefs.folders.some((x) => x.id === f.id) ? prefs.folders.map((x) => (x.id === f.id ? f : x)) : [...prefs.folders, f]); setFe(null); };
  const clearCache = async () => { ['recentEmoji', 'recentStickers'].forEach((k) => localStorage.removeItem(k)); try { for (const k of await caches.keys()) await caches.delete(k); } catch {} alert('Кэш очищен'); };
  const setPrivacy = async (k, v) => { setPriv((p) => ({ ...p, [k]: v })); try { await api('/privacy', { key: k, value: v }, 'PUT'); } catch (e) { alert(e.message); } };
  const unblock = async (id) => { await api('/blocks/' + id, {}, 'DELETE'); setBlocks((b) => b.filter((x) => x.id !== id)); onChange(); };
  const kill = async (id) => { await api('/sessions/' + id, {}, 'DELETE'); loadSes(); };
  const killAll = async () => { await api('/sessions/terminate-others', {}); loadSes(); };
  const setDays = async (d) => { await api('/sessions/ttl', { days: d }, 'PUT'); loadSes(); };
  const delSticker = async (id) => { await api('/stickers/' + id, {}, 'DELETE'); setMine((m) => m.filter((s) => s.id !== id)); };
  const toggleNotify = async (e) => {
    const on = e.target.checked;
    if (on && 'Notification' in window && Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') return;
    set('notify', on);
  };
  const level = !prefs.fx ? 0 : prefs.fxBlur && prefs.fxMedia ? 2 : 1;
  const curS = ses?.items.find((i) => i.id === ses.current); const others = (ses?.items || []).filter((i) => i.id !== ses?.current);
  const back = () => (page === 'main' ? onClose() : setPage(PARENT[page] || 'main'));

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
            {nav('sliders', '#ff9500', 'Основные', 'Тема, размер текста, клавиатура', 'general')}
            {nav('bell', '#ff3b30', 'Уведомления', 'Звуки, всплывающие уведомления', 'notif')}
            {nav('lock', '#8e8e93', 'Конфиденциальность', 'Чёрный список, видимость профиля', 'privacy')}
            {nav('pie', '#34c759', 'Данные и память', 'Автозагрузка медиафайлов, кэш', 'data')}
            {nav('folder', '#3aa0f0', 'Папки с чатами', 'Сортировка чатов по папкам', 'folders')}
            {nav('bolt', '#8e63e6', 'Анимации и скорость', 'Анимации, переходы', 'anim')}
            {nav('smile', '#ff2d78', 'Стикеры и эмодзи', 'Мои стикеры, подсказки', 'stickers')}
            {nav('globe', '#7c5cff', 'Язык', LANGS.find((l) => l[0] === LANG)?.[1], 'lang')}
            {nav('devices', '#3aa0f0', 'Активные сеансы', 'Устройства, завершение сеансов', 'sessions')}
          </div></>}

        {page === 'general' && <>
          {sec('Настройки', rng('fs', 'Размер текста', 12, 20), <Row key="w" ico="palette" color="#ff9500" title="Обои для чатов" onClick={() => setPage('wall')} />)}
          {sec('Тема', rad('theme', 'light', 'Светлая'), rad('theme', 'dark', 'Тёмная'), rad('theme', 'auto', 'Авто'))}
          {sec('Формат времени', rad('h12', true, '12-часовой'), rad('h12', false, '24-часовой'))}
          {sec('Клавиатура', rad('sendMode', 'enter', 'Отправка по Enter', 'Разрыв строки по сочетанию Shift + Enter'),
            rad('sendMode', 'ctrl', 'Отправка по Ctrl+Enter', 'Разрыв строки по клавише Enter'), chk('autoText', 'Автозамена текста', false))}
          <div className="hint">{'Преобразование --, << и >> при вводе'}</div></>}

        {page === 'wall' && <>
          <div className="icard">
            <label className="srow click"><span className="sico" style={{ background: '#3390ec' }}><Icon n="camera" size={20} /></span><div className="smeta"><b>Загрузить изображение</b></div>
              <input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={pickWall} /></label>
            <label className="srow click"><span className="sico" style={{ background: '#ff9500' }}><Icon n="palette" size={20} /></span><div className="smeta"><b>Задать цвет</b></div>
              <input className="colorin" type="color" onChange={(e) => setWall({ type: 'color', value: e.target.value })} /></label>
            <Row ico="star" color="#8e63e6" title="Восстановить по умолчанию" onClick={() => set('wall', { type: 'default', value: '', blur: false, pat: 75 })} />
            <label className="srow click"><input className="cbx" type="checkbox" checked={w.blur} onChange={(e) => setWall({ blur: e.target.checked })} /><div className="smeta"><b>Размытие</b></div></label>
            <div className="srow col"><div className="rline"><b>Яркость узора</b><span>{w.pat}</span></div><input type="range" min={0} max={100} value={w.pat} onChange={(e) => setWall({ pat: +e.target.value })} /></div>
          </div>
          <div className="shl"><span>Цвета, градиенты и узоры</span></div>
          <div className="wgrid">{WALLS.map((g) => <button key={g} className={'wsw' + (w.type === 'grad' && w.value === g ? ' on' : '')} style={{ background: g }} onClick={() => setWall({ type: 'grad', value: g })} />)}</div></>}

        {page === 'notif' && <>
          {sec('Веб-уведомления',
            <label key="n" className="srow click"><input className="cbx" type="checkbox" checked={prefs.notify} onChange={toggleNotify} /><div className="smeta"><b>Веб-уведомления</b><small>{prefs.notify ? 'Вкл.' : 'Выкл.'}</small></div></label>,
            rng('volume', 'Громкость звука', 0, 10))}
          {[['direct', 'Личные чаты', 'Уведомления из личных чатов'], ['group', 'Группы', 'Уведомления из групп'], ['channel', 'Каналы', 'Уведомления из каналов']]
            .map(([k, h, l]) => sec(h, chk('n_' + k, l, true), chk('pv_' + k, 'Предпросмотр сообщений', true)))}</>}

        {page === 'privacy' && <>
          <div className="icard"><Row ico="block" color="#e5534b" title="Чёрный список" sub={blocks ? String(blocks.length) : ''} onClick={() => setPage('blocked')} /></div>
          {sec('Конфиденциальность', ...PRIV.map(([k, l]) => (
            <div key={k} className="srow"><div className="smeta"><b>{l}</b></div>
              <select className="sel" value={priv?.[k] || 'all'} onChange={(e) => setPrivacy(k, e.target.value)}><option value="all">Все</option><option value="none">Никто</option></select></div>)))}
          {sec('Название окна', chk('titleChat', 'Показывать название чата'))}</>}

        {page === 'blocked' && <div className="icard">
          {blocks?.map((u) => <Row key={u.id} title={u.name} sub={'@' + u.username} right={<button className="ghost" onClick={() => unblock(u.id)}>Разблокировать</button>} />)}
          {blocks && !blocks.length && <div className="sub wrapx">Список пуст</div>}</div>}

        {page === 'data' && <>
          {sec('Автозагрузка фото', ...T3.map(([k, l]) => chk('ap_' + k, l)))}
          {sec('Автозагрузка видео и GIF', ...T3.map(([k, l]) => chk('av_' + k, l)))}
          <div className="icard"><Row ico="trash" color="#e5534b" title="Очистить кэш медиа" sub="Удаление с устройства медиа, закэшированных для этого аккаунта" onClick={clearCache} /></div></>}

        {page === 'folders' && <>
          <div className="center"><Icon n="folder" size={64} /><div>Вы можете создать папки с нужными чатами и переключаться между ними.</div>
            <button onClick={() => setFe({})}><Icon n="plus" size={18} /> Создать новую папку</button></div>
          {sec('Папки с чатами', <Row key="all" title="Все чаты" sub="Все ваши чаты" />,
            ...prefs.folders.map((f) => (
              <Row key={f.id} title={f.name} sub={f.chatIds ? `${f.chatIds.length} чатов` : KINDS.find((k) => k[0] === f.kind)?.[2]}
                right={<>{f.chatIds && <button className="ib" title="Изменить" onClick={() => setFe(f)}><Icon n="edit" size={18} /></button>}
                  <button className="ib" title="Удалить" onClick={() => set('folders', prefs.folders.filter((x) => x.id !== f.id))}><Icon n="trash" size={18} /></button></>} />)))}
          {sec('Рекомендованные папки', ...KINDS.filter(([k]) => !prefs.folders.some((f) => f.kind === k)).map(([k, n, d]) => (
            <Row key={k} title={n} sub={d} right={<button onClick={() => set('folders', [...prefs.folders, { id: 'f' + k + Date.now(), name: n, kind: k }])}>Добавить</button>} />)))}
          {sec('Вкладки', rad('tabsPos', 'left', 'Панель слева'), rad('tabsPos', 'top', 'Панель вверху'))}</>}

        {page === 'anim' && <>
          <div className="icard"><div className="srow col">
            <input type="range" min={0} max={2} step={1} value={level} onChange={(e) => { Object.entries(ANIM[+e.target.value]).forEach(([k, v]) => savePref(k, v)); force((x) => x + 1); onChange(); }} />
            <div className="steps"><span>Экономия ресурсов</span><span>Баланс</span><span>Максимум анимации</span></div></div></div>
          {sec('Ресурсоёмкие процессы', chk('fx', 'Анимации интерфейса'), chk('fxChat', 'Переходы в меню и между чатами'), chk('fxSend', 'Анимация отправки сообщений'),
            chk('fxMedia', 'Анимация при просмотре медиа'), chk('fxMenu', 'Анимация контекстных меню'), chk('fxBlur', 'Размытие в контекстных меню'),
            chk('fxPanel', 'Анимация в меню справа'), chk('fxDel', 'Анимация удаления'))}
          {sec('Автовоспроизведение', chk('autoGif', 'Автозапуск GIF'))}</>}

        {page === 'stickers' && <>
          {sec('Подсказки', chk('stkSuggest', 'Подсказка стикеров по эмодзи'))}
          {sec('Мои стикеры', mine.length
            ? <div key="g" className="sgrid pad">{mine.map((s) => <div key={s.id} className="stk"><img src={s.url} alt="" /><span className="xdel on" onClick={() => delSticker(s.id)}><Icon n="close" size={12} /></span></div>)}</div>
            : <div key="e" className="sub wrapx">Своих стикеров пока нет. Добавьте их в панели стикеров кнопкой «＋».</div>)}</>}

        {page === 'lang' && <>
          {sec('Язык интерфейса', ...LANGS.map(([c, n, en]) => (
            <label key={c} className="srow click"><input className="cbx" type="radio" name="lang" checked={LANG === c} onChange={() => { savePref('lang', c); location.reload(); }} />
              <div className="smeta"><b>{n}</b><small>{en}</small></div></label>)))}
          <div className="hint">Страница перезагрузится после выбора языка.</div></>}

        {page === 'sessions' && <>
          {sec('Это устройство', <Row key="c" ico="devices" color="#3aa0f0" title={curS?.device || 'Браузер'} sub={ipName(curS?.ip) || 'Сейчас в сети'} />,
            others.length > 0 && <Row key="k" ico="block" color="#e5534b" danger title="Завершить все другие сеансы" onClick={killAll} />)}
          {others.length > 0 && sec('Активные сеансы', ...others.map((i) => (
            <Row key={i.id} ico="devices" color="#7c5cff" title={i.device} sub={`${ipName(i.ip)} · ${dd(i.last_active)}`}
              right={<button className="ib" title="Завершить сеанс" onClick={() => kill(i.id)}><Icon n="close" size={18} /></button>} />)))}
          {sec('Автоматически завершать сеансы', <div key="h" className="sub wrapx">Если сеанс неактивен</div>,
            ...[[7, '1 неделя'], [30, '1 месяц'], [90, '3 месяца'], [180, '6 месяцев']].map(([d, l]) => (
              <label key={d} className="srow click"><input className="cbx" type="radio" name="days" checked={ses?.days === d} onChange={() => setDays(d)} /><div className="smeta"><b>{l}</b></div></label>)))}</>}
      </div>
      {fe && <FolderEdit folder={fe.id ? fe : null} chats={chats} onSave={saveFolder} onClose={() => setFe(null)} />}
    </div>);
}
