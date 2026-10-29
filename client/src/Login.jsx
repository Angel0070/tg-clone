import { useState } from 'react';
import { api } from './api.js';
import { Icon } from './icons.jsx';

/* ---------- Вход ---------- */
export function Login({ onDone }) {
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

