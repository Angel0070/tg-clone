import { useState } from 'react';
import { api } from './api.js';
import { Icon } from './icons.jsx';
import { Ava } from './utils.jsx';

export function ContactEdit({ chat, muted, onToggleMute, onClose, onSaved, onDelete }) {
  const real = chat.real_name || chat.name;
  const [f, setF] = useState({ first_name: chat.first_name || real, last_name: chat.last_name || '', note: chat.note || '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    const same = f.first_name.trim() === real && !f.last_name.trim();
    try { await api('/contacts/' + chat.peer_id, same ? { ...f, first_name: '', last_name: '' } : f, 'PUT'); onSaved(); onClose(); }
    catch (e) { setErr(e.message); }
  };
  return (
    <div className="info">
      <div className="ihead"><button className="ib" onClick={onClose}><Icon n="back" /></button><b>Изменить</b></div>
      <div className="iscroll">
        <div className="iprof"><Ava name={chat.name} url={chat.avatar} /><div className="nm bignm">{chat.name}</div></div>
        <div className="icard fields">
          <label>Имя<input value={f.first_name} onChange={set('first_name')} maxLength={64} /></label>
          <label>Фамилия<input value={f.last_name} onChange={set('last_name')} maxLength={64} /></label>
          <label>Заметка<input value={f.note} onChange={set('note')} maxLength={128} /><small className="cnt">{f.note.length} / 128</small></label>
        </div>
        <div className="hint">Заметку видите только Вы.</div>
        <div className="icard"><label className="srow click"><input className="cbx" type="checkbox" checked={!muted} onChange={onToggleMute} />
          <div className="smeta"><b>Уведомления</b><small>{muted ? 'Выкл.' : 'Вкл.'}</small></div></label></div>
        {err && <div className="err hint">{err}</div>}
        <div className="icard"><button className="ghost danger-t full" onClick={onDelete}><Icon n="trash" size={20} />Удалить контакт</button></div>
      </div>
      <button className="fab savefab" title="Сохранить" onClick={save}><Icon n="check" /></button>
    </div>);
}
