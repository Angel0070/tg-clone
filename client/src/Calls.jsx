import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { Icon } from './icons.jsx';
import { Ava, Emo, fmt } from './utils.jsx';
import { prefs } from './prefs.js';

const QUICK = ['❤️', '👍', '😂', '🔥', '😮', '👏', '🎉'];

// Рингтоны без файлов: «ring» — входящий, «back» — гудок у звонящего.
function ringtone(kind) {
  let ctx; try { ctx = new AudioContext(); } catch { return () => {}; }
  const beep = (f, d) => {
    try {
      const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d);
      o.start(); o.stop(ctx.currentTime + d + 0.05);
    } catch {}
  };
  const play = () => { if (kind === 'ring') { beep(880, 0.3); setTimeout(() => beep(660, 0.3), 380); setTimeout(() => beep(880, 0.3), 1000); setTimeout(() => beep(660, 0.3), 1380); } else beep(425, 1); };
  play(); const i = setInterval(play, kind === 'ring' ? 3200 : 3500);
  return () => { clearInterval(i); setTimeout(() => { try { ctx.close(); } catch {} }, 1600); };
}

export function useCalls({ sock }) {
  const [call, setCall] = useState(null); const [remote, setRemote] = useState(null); const [local, setLocal] = useState(null); const [floaters, setFloaters] = useState([]);
  const R = useRef({}); const callRef = useRef(null); callRef.current = call;
  const send = (data) => { const c = callRef.current; if (c?.id) sock.current.emit('call:signal', { id: c.id, data }); };
  const sendState = () => { const r = R.current; send({ type: 'state', mic: !r.micMuted, cam: !!r.camOn, screen: !!r.screenOn }); };
  const float = (e) => { const id = Math.random(); setFloaters((f) => [...f, { id, e, x: 8 + Math.random() * 80 }]); setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 2600); };

  const cleanup = () => {
    const r = R.current; r.tone?.(); try { r.pc?.close(); } catch {}
    [r.mic, r.cam, r.screen].forEach((s) => s?.getTracks().forEach((t) => t.stop()));
    R.current = {}; setCall(null); setRemote(null); setLocal(null);
  };
  const getMedia = async (video) => {
    let mic;
    try { mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch { alert('Нужен доступ к микрофону'); return null; }
    let cam = null;
    if (video) { try { cam = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } }); } catch { alert('Нужен доступ к камере'); } }
    return { mic, cam };
  };
  const hangup = () => { const c = callRef.current; if (c?.id) sock.current.emit('call:end', { id: c.id }); cleanup(); };
  const decline = () => { const c = callRef.current; if (c?.id) sock.current.emit('call:decline', { id: c.id }); cleanup(); };

  const onSignal = async ({ id, data }) => {
    const r = R.current; const pc = r.pc;
    if (!callRef.current || callRef.current.id !== id) return;
    if (data.type === 'state') { setCall((c) => c && { ...c, remoteMic: data.mic, remoteCam: data.cam, remoteScreen: data.screen }); return; }
    if (data.type === 'react') { float(data.emoji); return; }
    if (!pc) { r.pending = [...(r.pending || []), data]; return; }
    try { // «perfect negotiation»: звонящий уступать не обязан, принимающий — вежливый
      if (data.sdp) {
        const collision = data.sdp.type === 'offer' && (r.makingOffer || pc.signalingState !== 'stable');
        r.ignoreOffer = !r.polite && collision; if (r.ignoreOffer) return;
        await pc.setRemoteDescription(data.sdp);
        if (data.sdp.type === 'offer') { await pc.setLocalDescription(); send({ sdp: pc.localDescription }); }
      } else if (data.candidate) {
        try { await pc.addIceCandidate(data.candidate); } catch (e) { if (!r.ignoreOffer) throw e; }
      }
    } catch (e) { console.error('call signal', e); }
  };
  const makePc = async () => {
    const r = R.current;
    const pc = new RTCPeerConnection({ iceServers: await api('/ice') });
    r.pc = pc; r.makingOffer = false; r.ignoreOffer = false;
    pc.onicecandidate = (e) => { if (e.candidate) send({ candidate: e.candidate }); };
    pc.ontrack = (e) => { r.remoteStream = r.remoteStream || new MediaStream(); r.remoteStream.addTrack(e.track); setRemote(new MediaStream(r.remoteStream.getTracks())); };
    pc.onnegotiationneeded = async () => {
      try { r.makingOffer = true; await pc.setLocalDescription(); send({ sdp: pc.localDescription }); }
      catch (e) { console.error(e); } finally { r.makingOffer = false; }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') { setCall((c) => (c && c.phase !== 'active' ? { ...c, phase: 'active', startedAt: Date.now() } : c)); sendState(); }
      if (pc.connectionState === 'failed') { alert('Не удалось соединиться'); hangup(); }
    };
    pc.addTrack(r.mic.getAudioTracks()[0], r.mic);
    r.videoTx = pc.addTransceiver('video', { direction: 'sendrecv' }); // всегда есть «слот» под камеру или экран
    const vt = r.cam?.getVideoTracks()[0]; if (vt) await r.videoTx.sender.replaceTrack(vt);
    for (const d of r.pending || []) await onSignal({ id: callRef.current.id, data: d });
    r.pending = [];
  };

  const startCall = async (chat, video) => {
    if (callRef.current) return alert('Вы уже в звонке');
    if (!window.RTCPeerConnection || !navigator.mediaDevices) return alert('Браузер не поддерживает звонки');
    const m = await getMedia(video); if (!m) return;
    const r = R.current; r.mic = m.mic; r.cam = m.cam; r.camOn = !!m.cam; r.micMuted = false; r.polite = false;
    setCall({ id: null, chatId: chat.id, peer: { id: chat.peer_id, name: chat.name, avatar: chat.avatar }, video, dir: 'out', phase: 'calling', mic: true, cam: !!m.cam, screen: false, remoteMic: true, remoteCam: video, remoteScreen: false });
    setLocal(m.cam ? new MediaStream(m.cam.getVideoTracks()) : null);
    r.tone = ringtone('back'); sock.current.emit('call:invite', { chatId: chat.id, video });
  };
  const accept = async () => {
    const c = callRef.current; if (!c) return;
    const m = await getMedia(c.video); if (!m) return decline();
    const r = R.current; r.tone?.(); r.tone = null; r.mic = m.mic; r.cam = m.cam; r.camOn = !!m.cam; r.micMuted = false; r.polite = true;
    setLocal(m.cam ? new MediaStream(m.cam.getVideoTracks()) : null);
    setCall({ ...c, phase: 'connecting', mic: true, cam: !!m.cam }); sock.current.emit('call:accept', { id: c.id });
  };

  const toggleMic = () => {
    const r = R.current; r.micMuted = !r.micMuted; r.mic?.getAudioTracks().forEach((t) => { t.enabled = !r.micMuted; });
    setCall((c) => c && { ...c, mic: !r.micMuted }); sendState();
  };
  const setVideoTrack = async (track) => { const r = R.current; await r.videoTx?.sender.replaceTrack(track); setLocal(track ? new MediaStream([track]) : null); };
  const toggleCam = async () => {
    const r = R.current;
    if (r.camOn) { r.cam?.getTracks().forEach((t) => t.stop()); r.cam = null; r.camOn = false; if (!r.screenOn) await setVideoTrack(null); }
    else {
      try { const s = await navigator.mediaDevices.getUserMedia({ video: true }); r.cam = s; r.camOn = true; if (!r.screenOn) await setVideoTrack(s.getVideoTracks()[0]); }
      catch { alert('Нужен доступ к камере'); return; }
    }
    setCall((c) => c && { ...c, cam: r.camOn }); sendState();
  };
  const stopScreen = async () => {
    const r = R.current; if (!r.screenOn) return;
    r.screen?.getTracks().forEach((t) => t.stop()); r.screen = null; r.screenOn = false;
    await setVideoTrack(r.camOn ? r.cam.getVideoTracks()[0] : null);
    setCall((c) => c && { ...c, screen: false }); sendState();
  };
  const toggleScreen = async () => {
    const r = R.current; if (r.screenOn) return stopScreen();
    if (!navigator.mediaDevices.getDisplayMedia) return alert('Браузер не поддерживает звонки');
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
      r.screen = s; r.screenOn = true; const t = s.getVideoTracks()[0]; t.onended = stopScreen;
      await setVideoTrack(t); setCall((c) => c && { ...c, screen: true }); sendState();
    } catch { /* пользователь отменил выбор экрана */ }
  };
  const react = (e) => { float(e); send({ type: 'react', emoji: e }); };

  const bind = (s) => {
    s.on('call:incoming', (d) => {
      if (callRef.current) return;
      setCall({ id: d.id, chatId: d.chatId, peer: d.from, video: d.video, dir: 'in', phase: 'ringing', mic: true, cam: false, screen: false, remoteMic: true, remoteCam: d.video, remoteScreen: false });
      R.current.tone = ringtone('ring');
      if (document.visibilityState !== 'visible' && prefs.notify && window.Notification?.permission === 'granted') new Notification(d.from.name, { body: d.video ? 'Входящий видеозвонок' : 'Входящий звонок' });
    });
    s.on('call:ringing', ({ id }) => { if (!callRef.current) return s.emit('call:end', { id }); setCall((c) => c && { ...c, id }); });
    s.on('call:accepted', async ({ id }) => {
      const r = R.current; r.tone?.(); r.tone = null;
      setCall((c) => c && { ...c, id, phase: 'connecting' });
      callRef.current = { ...(callRef.current || {}), id };
      await makePc();
    });
    s.on('call:signal', onSignal);
    s.on('call:ended', (d) => { if (callRef.current?.id === d.id) cleanup(); });
    s.on('call:taken', (d) => { if (callRef.current?.id === d.id && callRef.current.phase === 'ringing') cleanup(); });
    s.on('call:fail', (m) => { alert(m); cleanup(); });
  };
  return { call, remote, local, floaters, startCall, accept, decline, hangup, toggleMic, toggleCam, toggleScreen, react, bind };
}

export function CallUI({ c }) {
  const { call, remote, local, floaters } = c;
  const [, tick] = useState(0); const [rp, setRp] = useState(false); const [mini, setMini] = useState(false);
  const wrap = useRef(null); const rv = useRef(null); const lv = useRef(null);
  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(i); }, []);
  useEffect(() => { if (rv.current) rv.current.srcObject = remote; }, [remote, call?.phase]);
  useEffect(() => { if (lv.current) lv.current.srcObject = local; }, [local, call?.phase, mini]);
  useEffect(() => { if (!call) { setMini(false); setRp(false); } }, [call]);
  if (!call) return null;
  if (call.phase === 'ringing') return (
    <div className="incoming">
      <Ava name={call.peer.name} url={call.peer.avatar} />
      <div className="cname"><b>{call.peer.name}</b><span>{call.video ? 'Входящий видеозвонок' : 'Входящий звонок'}</span></div>
      <button className="cbtn red" title="Отклонить" onClick={c.decline}><Icon n="endcall" /></button>
      <button className="cbtn green" title="Принять" onClick={c.accept}><Icon n={call.video ? 'video' : 'phone'} /></button>
    </div>);
  const showRemote = call.remoteCam || call.remoteScreen;
  const secs = call.startedAt ? Math.floor((Date.now() - call.startedAt) / 1000) : 0;
  const status = call.phase === 'calling' ? 'Вызов…' : call.phase === 'connecting' ? 'Соединение…' : fmt(secs);
  const fullscreen = () => { if (document.fullscreenElement) document.exitFullscreen(); else wrap.current?.requestFullscreen?.(); };
  return (
    <div ref={wrap} className={'callwin' + (mini ? ' mini' : '')}>
      <video ref={rv} className={'cvid' + (showRemote ? '' : ' off')} autoPlay playsInline />
      <div className="ctop"><div><b>{call.peer.name}</b>
        <div className="cst">{status}{!call.remoteMic && <Icon n="micoff" size={14} />}</div>
        {call.remoteScreen && <div className="cst"><Icon n="screen" size={14} />Собеседник показывает экран</div>}</div></div>
      <div className="cmid">{!showRemote && <div className={'pring' + (call.phase !== 'active' ? ' pulse' : '')}><Ava name={call.peer.name} url={call.peer.avatar} /></div>}</div>
      {local && <div className="selfv"><video ref={lv} muted autoPlay playsInline className={call.screen ? '' : 'mirror'} /></div>}
      <div className="floaters">{floaters.map((f) => <span key={f.id} className="fl" style={{ left: f.x + '%' }}><Emo e={f.e} /></span>)}</div>
      {rp && <div className="rpick">{QUICK.map((e) => <button key={e} onClick={() => { c.react(e); setRp(false); }}><Emo e={e} /></button>)}</div>}
      <div className="cbar">
        <button className={'cb keep' + (call.mic ? '' : ' off')} title="Микрофон" onClick={c.toggleMic}><Icon n={call.mic ? 'mic' : 'micoff'} /></button>
        <button className={'cb' + (call.cam ? ' on' : '')} title="Камера" onClick={c.toggleCam}><Icon n={call.cam ? 'video' : 'videooff'} /></button>
        <button className={'cb' + (call.screen ? ' on' : '')} title="Демонстрация экрана" onClick={c.toggleScreen}><Icon n="screen" /></button>
        <button className="cb" title="Реакции" onClick={() => setRp((v) => !v)}><Icon n="smile" /></button>
        <button className="cb" title="На весь экран" onClick={fullscreen}><Icon n="maximize" /></button>
        <button className="cb keep" title={mini ? 'Развернуть' : 'Свернуть'} onClick={() => setMini(!mini)}><Icon n={mini ? 'maximize' : 'minimize'} /></button>
        <button className="cb keep end" title="Завершить" onClick={c.hangup}><Icon n="endcall" /></button>
      </div>
    </div>);
}
