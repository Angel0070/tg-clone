import express from 'express'; import http from 'http'; import cors from 'cors';
import { Server } from 'socket.io'; import jwt from 'jsonwebtoken'; import { DatabaseSync } from 'node:sqlite'; import fs from 'fs'; import path from 'path'; import crypto from 'crypto';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const db = new DatabaseSync('tg.db');
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, login TEXT UNIQUE, name TEXT, username TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS chats(id INTEGER PRIMARY KEY, type TEXT DEFAULT 'direct', title TEXT);
CREATE TABLE IF NOT EXISTS members(chat_id INT, user_id INT, PRIMARY KEY(chat_id, user_id));
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY, chat_id INT, sender_id INT, text TEXT, created_at INTEGER);
`);

db.exec('CREATE TABLE IF NOT EXISTS hidden(user_id INT, message_id INT, PRIMARY KEY(user_id, message_id))');
for (const col of ['reply_to INT', 'edited INT DEFAULT 0', 'deleted INT DEFAULT 0', "kind TEXT DEFAULT 'text'", 'file_url TEXT', 'duration INT DEFAULT 0', 'file_name TEXT', 'file_size INT DEFAULT 0', 'waveform TEXT']) { try { db.exec('ALTER TABLE messages ADD COLUMN ' + col); } catch {} }
try { db.exec('ALTER TABLE members ADD COLUMN last_read INT DEFAULT 0'); } catch {}
for (const col of ['username TEXT', 'description TEXT', 'owner_id INT', 'ttl INT DEFAULT 0']) { try { db.exec('ALTER TABLE chats ADD COLUMN ' + col); } catch {} }
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS chats_username ON chats(username)');
db.exec('CREATE TABLE IF NOT EXISTS stickers(id INTEGER PRIMARY KEY, user_id INT, url TEXT, created_at INTEGER)');
db.exec('CREATE TABLE IF NOT EXISTS contacts(owner_id INT, user_id INT, first_name TEXT, last_name TEXT, note TEXT, PRIMARY KEY(owner_id, user_id))');
db.exec('CREATE TABLE IF NOT EXISTS blocks(user_id INT, blocked_id INT, PRIMARY KEY(user_id, blocked_id))');
db.exec('CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY, user_id INT, text TEXT, created_at INTEGER)');
for (const col of ['avatar TEXT', 'bio TEXT', 'birthday TEXT', 'last_seen INT']) { try { db.exec('ALTER TABLE users ADD COLUMN ' + col); } catch {} }

const UP = path.resolve('uploads'); fs.mkdirSync(UP, { recursive: true });
const app = express(); app.use(cors(), express.json());
app.use('/uploads', (req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); next(); }, express.static(UP));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const online = new Map(); // userId -> число открытых вкладок
const codes = new Map(); // login -> { code, exp }

const sign = (u) => jwt.sign({ id: u.id }, SECRET, { expiresIn: '30d' });
const auth = (req, res, next) => {
  try { req.uid = jwt.verify((req.headers.authorization || '').slice(7), SECRET).id; next(); }
  catch { res.status(401).json({ error: 'Требуется вход' }); }
};
const isMember = (chatId, uid) => db.prepare('SELECT 1 FROM members WHERE chat_id=? AND user_id=?').get(chatId, uid);

// --- Регистрация / вход: email или телефон, код выводится в консоль (SMS-заглушка) ---
app.post('/api/auth/request', (req, res) => {
  const login = String(req.body.login || '').trim().toLowerCase();
  if (!/^\+?\d{7,15}$/.test(login) && !/^\S+@\S+\.\S+$/.test(login))
    return res.status(400).json({ error: 'Введите email или номер телефона' });
  const code = String(Math.floor(10000 + Math.random() * 90000));
  codes.set(login, { code, exp: Date.now() + 5 * 60_000 });
  console.log(`[код для ${login}]: ${code}`);
  res.json({ ok: true, devCode: process.env.NODE_ENV === 'production' ? undefined : code });
});

app.post('/api/auth/verify', (req, res) => {
  const login = String(req.body.login || '').trim().toLowerCase();
  const c = codes.get(login);
  if (!c || c.exp < Date.now() || c.code !== String(req.body.code))
    return res.status(400).json({ error: 'Неверный или просроченный код' });
  codes.delete(login);
  let u = db.prepare('SELECT * FROM users WHERE login=?').get(login);
  if (!u) {
    const name = String(req.body.name || '').trim() || login.split('@')[0];
    const id = db.prepare('INSERT INTO users(login,name,username) VALUES(?,?,?)').run(login, name, 'user' + Date.now().toString(36)).lastInsertRowid;
    u = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  }
  res.json({ token: sign(u), user: u });
});

const getMe = (id) => db.prepare('SELECT id,login,name,username,avatar,bio,birthday FROM users WHERE id=?').get(id);
app.get('/api/me', auth, (req, res) => res.json(getMe(req.uid)));
app.patch('/api/me', auth, (req, res) => {
  const b = req.body;
  const name = String(b.name || '').trim().slice(0, 64);
  const username = String(b.username || '').trim().toLowerCase().replace(/^@/, '');
  if (!name) return res.status(400).json({ error: 'Имя обязательно' });
  if (!/^[a-z][a-z0-9_]{4,31}$/.test(username)) return res.status(400).json({ error: 'Имя пользователя: от 5 символов, только a–z, 0–9 и _, начинается с буквы' });
  if (db.prepare('SELECT 1 FROM users WHERE username=? AND id!=?').get(username, req.uid)) return res.status(400).json({ error: 'Это имя пользователя уже занято' });
  const avatar = /^\/uploads\/[a-f0-9]+\.(png|jpg|webp)$/.test(b.avatar || '') ? b.avatar : null;
  db.prepare('UPDATE users SET name=?, username=?, bio=?, birthday=?, avatar=? WHERE id=?')
    .run(name, username, String(b.bio || '').slice(0, 70), String(b.birthday || '').slice(0, 10), avatar, req.uid);
  res.json(getMe(req.uid));
});

const MAX_UPLOAD = 100 * 1024 * 1024;
const EXT = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/flac': 'flac', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'application/pdf': 'pdf', 'application/zip': 'zip', 'text/plain': 'txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx' };
app.post('/api/upload', auth, (req, res) => {
  const ext = EXT[String(req.headers['content-type'] || '').split(';')[0]];
  const tooBig = `Файл слишком большой (максимум ${MAX_UPLOAD >> 20} МБ)`;
  if (!ext) return res.status(400).json({ error: 'Этот тип файла не поддерживается' });
  if (Number(req.headers['content-length']) > MAX_UPLOAD) return res.status(413).set('Connection', 'close').json({ error: tooBig });
  let name = 'file.' + ext;
  try { name = decodeURIComponent(String(req.headers['x-file-name'] || name)).slice(0, 120); } catch {}
  const stored = crypto.randomBytes(12).toString('hex') + '.' + ext;
  const file = path.join(UP, stored);
  const ws = fs.createWriteStream(file);
  let size = 0, failed = false;
  const fail = (code, error) => { if (failed) return; failed = true; ws.destroy(); fs.unlink(file, () => {}); if (!res.headersSent) res.status(code).set('Connection', 'close').json({ error }); };
  req.on('data', (c) => { size += c.length; if (size > MAX_UPLOAD) { req.unpipe(ws); fail(413, tooBig); } });
  req.on('error', () => fail(400, 'Загрузка прервана'));
  ws.on('error', () => fail(500, 'Не удалось сохранить файл'));
  ws.on('finish', () => {
    if (failed) return;
    if (!size) { fs.unlink(file, () => {}); return res.status(400).json({ error: 'Пустой файл' }); }
    res.json({ url: '/uploads/' + stored, name, size });
  });
  req.pipe(ws);
});

app.get('/api/users/search', auth, (req, res) => {
  const q = `%${String(req.query.q || '').replace(/^@/, '')}%`;
  res.json(db.prepare('SELECT id,name,username,avatar FROM users WHERE id!=? AND (username LIKE ? OR name LIKE ?) LIMIT 20').all(req.uid, q, q));
});

app.post('/api/chats/direct', auth, (req, res) => {
  const peer = Number(req.body.userId);
  const found = db.prepare(`SELECT c.id FROM chats c
    JOIN members a ON a.chat_id=c.id AND a.user_id=? JOIN members b ON b.chat_id=c.id AND b.user_id=?
    WHERE c.type='direct'`).get(req.uid, peer);
  if (found) return res.json({ id: found.id });
  const id = db.prepare("INSERT INTO chats(type) VALUES('direct')").run().lastInsertRowid;
  const add = db.prepare('INSERT INTO members VALUES(?,?)'); add.run(id, req.uid); add.run(id, peer);
  res.json({ id });
});

const getMsg = (id) => db.prepare(`SELECT m.*, u.name AS sender_name, CASE WHEN r.text!='' THEN r.text WHEN r.kind='voice' THEN 'Голосовое сообщение' WHEN r.kind='sticker' THEN 'Стикер' WHEN r.kind='gif' THEN 'GIF' WHEN r.kind='image' THEN 'Фото' WHEN r.kind='video' THEN 'Видео' ELSE 'Файл' END AS reply_text, ru.name AS reply_name
  FROM messages m JOIN users u ON u.id=m.sender_id
  LEFT JOIN messages r ON r.id=m.reply_to LEFT JOIN users ru ON ru.id=r.sender_id WHERE m.id=?`).get(id);
const notify = (chatId, ev, payload) =>
  db.prepare('SELECT user_id FROM members WHERE chat_id=?').all(chatId).forEach((m) => io.to('user:' + m.user_id).emit(ev, payload));

app.post('/api/chats/group', auth, (req, res) => {
  const title = String(req.body.title || '').trim().slice(0, 64);
  const ids = [...new Set([req.uid, ...(req.body.userIds || []).map(Number)])]
    .filter((u) => db.prepare('SELECT 1 FROM users WHERE id=?').get(u));
  if (!title || ids.length < 2) return res.status(400).json({ error: 'Укажите название и добавьте хотя бы одного участника' });
  const id = db.prepare("INSERT INTO chats(type,title,owner_id) VALUES('group',?,?)").run(title, req.uid).lastInsertRowid;
  const add = db.prepare('INSERT INTO members VALUES(?,?)');
  ids.forEach((u) => { add.run(id, u); io.to('user:' + u).emit('chats'); });
  res.json({ id });
});

const decorate = (uid) => {
  const cm = new Map(db.prepare('SELECT * FROM contacts WHERE owner_id=?').all(uid).map((c) => [c.user_id, c]));
  const bl = new Set(db.prepare('SELECT blocked_id FROM blocks WHERE user_id=?').all(uid).map((b) => b.blocked_id));
  return (r) => {
    const c = cm.get(r.peer_id); const full = c ? `${c.first_name} ${c.last_name}`.trim() : '';
    return { ...r, online: !!r.peer_id && online.has(r.peer_id), real_name: r.name, name: full || r.name,
      first_name: c?.first_name || '', last_name: c?.last_name || '', note: c?.note || '', blocked: bl.has(r.peer_id) };
  };
};
app.get('/api/chats', auth, (req, res) => {
  const vis = 'id NOT IN (SELECT message_id FROM hidden WHERE user_id=?)';
  res.json(db.prepare(`SELECT c.id, c.type,
      CASE c.type WHEN 'direct' THEN p.name WHEN 'saved' THEN 'Избранное' ELSE c.title END AS name,
      CASE c.type WHEN 'direct' THEN p.username WHEN 'channel' THEN c.username ELSE NULL END AS username,
      CASE WHEN c.type='direct' THEN p.avatar END AS avatar,
      CASE WHEN c.type='direct' THEN p.id END AS peer_id, p.last_seen AS last_seen, c.owner_id, c.description, c.ttl,
      (SELECT COUNT(*) FROM members WHERE chat_id=c.id) AS members_count,
      (SELECT MIN(last_read) FROM members WHERE chat_id=c.id AND user_id!=?) AS peer_read,
      (SELECT COUNT(*) FROM messages WHERE chat_id=c.id AND sender_id!=? AND deleted=0 AND id>m.last_read) AS unread,
      (SELECT CASE WHEN text!='' THEN text WHEN kind='voice' THEN 'Голосовое сообщение' WHEN kind='audio' THEN 'Музыка' WHEN kind='sticker' THEN 'Стикер' WHEN kind='gif' THEN 'GIF' WHEN kind='image' THEN 'Фото' WHEN kind='video' THEN 'Видео' ELSE 'Файл' END FROM messages WHERE chat_id=c.id AND deleted=0 AND ${vis} ORDER BY id DESC LIMIT 1) AS last_text,
      COALESCE((SELECT created_at FROM messages WHERE chat_id=c.id AND deleted=0 AND ${vis} ORDER BY id DESC LIMIT 1), 0) AS last_at
    FROM chats c JOIN members m ON m.chat_id=c.id AND m.user_id=?
    LEFT JOIN users p ON c.type='direct' AND p.id=(SELECT user_id FROM members WHERE chat_id=c.id AND user_id!=? LIMIT 1)
    ORDER BY last_at DESC, c.id DESC`).all(...Array(6).fill(req.uid)).map(decorate(req.uid)));
});

app.get('/api/chats/:id/messages', auth, (req, res) => {
  if (!isMember(req.params.id, req.uid)) return res.status(403).json({ error: 'Нет доступа' });
  const ids = db.prepare('SELECT id FROM messages WHERE chat_id=? AND deleted=0 AND id NOT IN (SELECT message_id FROM hidden WHERE user_id=?) ORDER BY id DESC LIMIT 500').all(req.params.id, req.uid);
  res.json(ids.reverse().map((r) => getMsg(r.id)));
});

app.get('/api/chats/:id/info', auth, (req, res) => {
  const c = db.prepare('SELECT id,type,title,description,username,owner_id FROM chats WHERE id=?').get(req.params.id);
  if (!c || !isMember(c.id, req.uid)) return res.status(403).json({ error: 'Нет доступа' });
  if (c.type === 'group')
    return res.json({ type: 'group', title: c.title, members: db.prepare('SELECT u.id,u.name,u.username,u.avatar FROM members m JOIN users u ON u.id=m.user_id WHERE m.chat_id=?').all(c.id) });
  if (c.type === 'channel') return res.json({ type: 'channel', title: c.title, description: c.description, username: c.username, owner_id: c.owner_id,
    subscribers: db.prepare('SELECT COUNT(*) AS n FROM members WHERE chat_id=?').get(c.id).n });
  if (c.type === 'saved') return res.json({ type: 'saved' });
  res.json({ type: 'direct', user: db.prepare('SELECT u.id,u.name,u.username,u.avatar,u.bio,u.birthday,u.login FROM members m JOIN users u ON u.id=m.user_id WHERE m.chat_id=? AND u.id!=?').get(c.id, req.uid) });
});

app.get('/api/chats/:id/shared', auth, (req, res) => {
  if (!isMember(req.params.id, req.uid)) return res.status(403).json({ error: 'Нет доступа' });
  const where = { media: "kind IN ('image','video')", files: "kind='file'", voice: "kind='voice'", links: "text LIKE '%http%'" }[req.query.type];
  if (!where) return res.json([]);
  const ids = db.prepare(`SELECT id FROM messages WHERE chat_id=? AND deleted=0 AND ${where} AND id NOT IN (SELECT message_id FROM hidden WHERE user_id=?) ORDER BY id DESC LIMIT 200`).all(req.params.id, req.uid);
  res.json(ids.map((r) => getMsg(r.id)));
});

app.post('/api/chats/saved', auth, (req, res) => {
  const f = db.prepare("SELECT c.id FROM chats c JOIN members m ON m.chat_id=c.id AND m.user_id=? WHERE c.type='saved'").get(req.uid);
  if (f) return res.json({ id: f.id });
  const id = db.prepare("INSERT INTO chats(type,owner_id) VALUES('saved',?)").run(req.uid).lastInsertRowid;
  db.prepare('INSERT INTO members(chat_id,user_id) VALUES(?,?)').run(id, req.uid);
  res.json({ id });
});

app.post('/api/chats/channel', auth, (req, res) => {
  const title = String(req.body.title || '').trim().slice(0, 64);
  const description = String(req.body.description || '').trim().slice(0, 200);
  const username = String(req.body.username || '').trim().toLowerCase().replace(/^@/, '');
  if (!title) return res.status(400).json({ error: 'Укажите название канала' });
  if (!/^[a-z][a-z0-9_]{4,31}$/.test(username)) return res.status(400).json({ error: 'Ссылка канала: от 5 символов, только a–z, 0–9 и _, начинается с буквы' });
  if (db.prepare('SELECT 1 FROM chats WHERE username=?').get(username)) return res.status(400).json({ error: 'Эта ссылка уже занята' });
  const id = db.prepare("INSERT INTO chats(type,title,description,username,owner_id) VALUES('channel',?,?,?,?)").run(title, description, username, req.uid).lastInsertRowid;
  db.prepare('INSERT INTO members(chat_id,user_id) VALUES(?,?)').run(id, req.uid);
  res.json({ id });
});

app.get('/api/channels/search', auth, (req, res) => {
  const q = `%${String(req.query.q || '').replace(/^@/, '')}%`;
  res.json(db.prepare(`SELECT c.id, c.title AS name, c.username, c.description, (SELECT COUNT(*) FROM members WHERE chat_id=c.id) AS members_count
    FROM chats c WHERE c.type='channel' AND (c.title LIKE ? OR c.username LIKE ?) LIMIT 20`).all(q, q));
});

app.post('/api/channels/:id/join', auth, (req, res) => {
  const c = db.prepare("SELECT id FROM chats WHERE id=? AND type='channel'").get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Канал не найден' });
  db.prepare('INSERT OR IGNORE INTO members(chat_id,user_id) VALUES(?,?)').run(c.id, req.uid);
  io.to('user:' + req.uid).emit('chats');
  res.json({ id: c.id });
});

app.post('/api/chats/:id/leave', auth, (req, res) => {
  const c = db.prepare('SELECT id,type,owner_id FROM chats WHERE id=?').get(req.params.id);
  if (!c || !isMember(c.id, req.uid)) return res.status(403).json({ error: 'Нет доступа' });
  const others = db.prepare('SELECT user_id FROM members WHERE chat_id=? AND user_id!=?').all(c.id, req.uid);
  if (c.type === 'saved' || (c.type === 'channel' && c.owner_id === req.uid) || !others.length) {
    db.prepare('DELETE FROM messages WHERE chat_id=?').run(c.id);
    db.prepare('DELETE FROM members WHERE chat_id=?').run(c.id);
    db.prepare('DELETE FROM chats WHERE id=?').run(c.id);
  } else db.prepare('DELETE FROM members WHERE chat_id=? AND user_id=?').run(c.id, req.uid);
  [...others.map((m) => m.user_id), req.uid].forEach((u) => io.to('user:' + u).emit('chats'));
  res.json({ ok: true });
});

app.get('/api/chats/:id/search', auth, (req, res) => {
  if (!isMember(req.params.id, req.uid)) return res.status(403).json({ error: 'Нет доступа' });
  const q = `%${String(req.query.q || '').trim()}%`;
  const ids = db.prepare('SELECT id FROM messages WHERE chat_id=? AND deleted=0 AND text LIKE ? AND id NOT IN (SELECT message_id FROM hidden WHERE user_id=?) ORDER BY id DESC LIMIT 50').all(req.params.id, q, req.uid);
  res.json(ids.map((r) => getMsg(r.id)));
});

app.post('/api/report', auth, (req, res) => {
  const text = String(req.body.text || '').trim().slice(0, 2000);
  if (!text) return res.status(400).json({ error: 'Опишите проблему' });
  db.prepare('INSERT INTO reports(user_id,text,created_at) VALUES(?,?,?)').run(req.uid, text, Date.now());
  res.json({ ok: true });
});

// ---- стикеры, GIF, контакты, блокировки, автоудаление ----
app.get('/api/stickers', auth, (req, res) => res.json(db.prepare('SELECT id,url FROM stickers WHERE user_id=? ORDER BY id DESC').all(req.uid)));
app.post('/api/stickers', auth, (req, res) => {
  const url = String(req.body.url || '');
  if (!/^\/uploads\/[a-f0-9]+\.(png|webp|gif)$/.test(url)) return res.status(400).json({ error: 'Стикер: PNG, WebP или GIF' });
  const id = db.prepare('INSERT INTO stickers(user_id,url,created_at) VALUES(?,?,?)').run(req.uid, url, Date.now()).lastInsertRowid;
  res.json({ id, url });
});
app.delete('/api/stickers/:id', auth, (req, res) => { db.prepare('DELETE FROM stickers WHERE id=? AND user_id=?').run(req.params.id, req.uid); res.json({ ok: true }); });

const GIPHY_KEY = process.env.GIPHY_KEY || 'dc6zaTOxFJmzC';
app.get('/api/gifs', auth, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const url = `https://api.giphy.com/v1/gifs/${q ? 'search' : 'trending'}?api_key=${GIPHY_KEY}&limit=30&rating=pg-13&lang=ru${q ? '&q=' + encodeURIComponent(q) : ''}`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('giphy ' + r.status);
    const d = await r.json();
    res.json((d.data || []).map((g) => ({ id: g.id, mp4: g.images?.fixed_height?.mp4 })).filter((g) => g.mp4));
  } catch { res.status(502).json({ error: 'GIF-сервис недоступен. Получите бесплатный ключ на developers.giphy.com и запустите сервер с GIPHY_KEY=ваш_ключ' }); }
});

app.put('/api/contacts/:uid', auth, (req, res) => {
  const cut = (v, n) => String(v || '').trim().slice(0, n);
  db.prepare(`INSERT INTO contacts(owner_id,user_id,first_name,last_name,note) VALUES(?,?,?,?,?)
    ON CONFLICT(owner_id,user_id) DO UPDATE SET first_name=excluded.first_name, last_name=excluded.last_name, note=excluded.note`)
    .run(req.uid, Number(req.params.uid), cut(req.body.first_name, 64), cut(req.body.last_name, 64), cut(req.body.note, 128));
  io.to('user:' + req.uid).emit('chats');
  res.json({ ok: true });
});
app.post('/api/blocks/:uid', auth, (req, res) => {
  db.prepare('INSERT OR IGNORE INTO blocks(user_id,blocked_id) VALUES(?,?)').run(req.uid, Number(req.params.uid));
  io.to('user:' + req.uid).emit('chats'); res.json({ ok: true });
});
app.delete('/api/blocks/:uid', auth, (req, res) => {
  db.prepare('DELETE FROM blocks WHERE user_id=? AND blocked_id=?').run(req.uid, Number(req.params.uid));
  io.to('user:' + req.uid).emit('chats'); res.json({ ok: true });
});

app.post('/api/chats/:id/ttl', auth, (req, res) => {
  const c = db.prepare('SELECT id,type,owner_id FROM chats WHERE id=?').get(req.params.id);
  if (!c || !isMember(c.id, req.uid) || (c.type === 'channel' && c.owner_id !== req.uid)) return res.status(403).json({ error: 'Нет доступа' });
  const ttl = Math.max(0, Math.min(Number(req.body.ttl) || 0, 365 * 864e5));
  db.prepare('UPDATE chats SET ttl=? WHERE id=?').run(ttl, c.id);
  db.prepare('SELECT user_id FROM members WHERE chat_id=?').all(c.id).forEach((m) => io.to('user:' + m.user_id).emit('chats'));
  res.json({ ttl });
});
setInterval(() => { // автоудаление старых сообщений
  for (const c of db.prepare('SELECT id,ttl FROM chats WHERE ttl>0').all()) {
    for (const m of db.prepare('SELECT id FROM messages WHERE chat_id=? AND created_at<?').all(c.id, Date.now() - c.ttl)) {
      db.prepare('DELETE FROM messages WHERE id=?').run(m.id);
      notify(c.id, 'message:delete', { id: m.id, chat_id: c.id });
    }
  }
}, 30000);

// --- Реалтайм ---
io.use((s, next) => {
  try { s.uid = jwt.verify(s.handshake.auth.token, SECRET).id; next(); } catch { next(new Error('auth')); }
});
io.on('connection', (s) => {
  s.join('user:' + s.uid);
  online.set(s.uid, (online.get(s.uid) || 0) + 1);
  if (online.get(s.uid) === 1) io.emit('presence', { userId: s.uid, online: true });
  s.on('disconnect', () => {
    const n = (online.get(s.uid) || 1) - 1;
    if (n > 0) return online.set(s.uid, n);
    online.delete(s.uid);
    const lastSeen = Date.now();
    db.prepare('UPDATE users SET last_seen=? WHERE id=?').run(lastSeen, s.uid);
    io.emit('presence', { userId: s.uid, online: false, lastSeen });
  });
  s.on('read', ({ chatId, upTo }) => {
    upTo = Number(upTo);
    if (!upTo || !isMember(chatId, s.uid)) return;
    db.prepare('UPDATE members SET last_read=MAX(last_read, ?) WHERE chat_id=? AND user_id=?').run(upTo, chatId, s.uid);
    notify(chatId, 'read', { chatId, userId: s.uid, upTo });
  });
  const clean = (t) => String(t || '').trim().slice(0, 4000);
  const KIND_EXT = { voice: 'webm|ogg|m4a', audio: 'mp3|wav|flac|ogg|m4a', image: 'png|jpg|webp|gif', video: 'mp4|webm|mov', file: 'pdf|zip|txt|docx|xlsx|pptx' };
  s.on('message', ({ chatId, text, replyTo, kind, fileUrl, fileName, fileSize, duration, waveform }) => {
    const okUrl = (k, u) => (k === 'sticker'
      ? /^\/uploads\/[a-f0-9]+\.(png|webp|gif)$/.test(u) || /^https:\/\/cdn\.jsdelivr\.net\/gh\/twitter\/twemoji@[\d.]+\/assets\/svg\/[0-9a-f-]+\.svg$/.test(u)
      : k === 'gif' ? /^https:\/\/media\d*\.giphy\.com\/.+\.mp4(\?.*)?$/.test(u)
      : !!KIND_EXT[k] && new RegExp(`^/uploads/[a-f0-9]+\\.(${KIND_EXT[k]})$`).test(u));
    const media = okUrl(kind, fileUrl || '');
    text = media && ['voice', 'sticker', 'gif'].includes(kind) ? '' : clean(text);
    if ((!text && !media) || !isMember(chatId, s.uid)) return;
    const ch = db.prepare('SELECT type, owner_id FROM chats WHERE id=?').get(chatId);
    if (ch.type === 'channel' && ch.owner_id !== s.uid) return; // в канале пишет только владелец
    if (ch.type === 'direct') {
      const peer = db.prepare('SELECT user_id FROM members WHERE chat_id=? AND user_id!=?').get(chatId, s.uid);
      if (peer && db.prepare('SELECT 1 FROM blocks WHERE (user_id=? AND blocked_id=?) OR (user_id=? AND blocked_id=?)').get(s.uid, peer.user_id, peer.user_id, s.uid))
        return s.emit('notice', 'Сообщение не доставлено: пользователь заблокирован');
    }
    const ok = replyTo && db.prepare('SELECT 1 FROM messages WHERE id=? AND chat_id=?').get(replyTo, chatId);
    const wf = media && kind === 'voice' && /^\d{1,2}(,\d{1,2}){3,79}$/.test(waveform || '') ? waveform : null;
    const id = db.prepare('INSERT INTO messages(chat_id,sender_id,text,created_at,reply_to,kind,file_url,file_name,file_size,duration,waveform) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
      .run(chatId, s.uid, text, Date.now(), ok ? replyTo : null, media ? kind : 'text', media ? fileUrl : null,
        media ? String(fileName || '').slice(0, 120) : null, media ? Math.min(Number(fileSize) || 0, MAX_UPLOAD) : 0, media ? Math.min(Number(duration) || 0, 600) : 0, wf).lastInsertRowid;
    notify(chatId, 'message', getMsg(id));
  });
  s.on('edit', ({ id, text }) => {
    text = clean(text);
    const m = db.prepare('SELECT chat_id FROM messages WHERE id=? AND sender_id=? AND deleted=0 AND kind=\'text\'').get(id, s.uid);
    if (!m || !text) return;
    db.prepare('UPDATE messages SET text=?, edited=1 WHERE id=?').run(text, id);
    notify(m.chat_id, 'message:update', getMsg(id));
  });
  s.on('delete', ({ id, forAll }) => {
    const m = db.prepare('SELECT m.chat_id, m.sender_id, c.type FROM messages m JOIN chats c ON c.id=m.chat_id WHERE m.id=?').get(id);
    if (!m || !isMember(m.chat_id, s.uid)) return;
    if (forAll && (m.sender_id === s.uid || m.type === 'direct')) {
      db.prepare('DELETE FROM messages WHERE id=?').run(id);
      notify(m.chat_id, 'message:delete', { id, chat_id: m.chat_id });
    } else {
      db.prepare('INSERT OR IGNORE INTO hidden VALUES(?,?)').run(s.uid, id);
      io.to('user:' + s.uid).emit('message:delete', { id, chat_id: m.chat_id });
    }
  });
  s.on('typing', ({ chatId }) => {
    if (!isMember(chatId, s.uid)) return;
    db.prepare('SELECT user_id FROM members WHERE chat_id=? AND user_id!=?').all(chatId, s.uid)
      .forEach((m) => io.to('user:' + m.user_id).emit('typing', { chatId, userId: s.uid }));
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.type === 'entity.too.large' ? 'Слишком большой запрос' : 'Ошибка сервера' });
});

server.listen(3001, () => console.log('Сервер: http://localhost:3001'));
