import { useState } from 'react';
import { api, upload } from './api.js';
import { Icon } from './icons.jsx';
import { Ava } from './utils.jsx';

/* ---------- Настройки профиля ---------- */
export function EditProfile({ me, onSave, onClose }) {
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

