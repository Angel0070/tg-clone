import express from 'express'; import http from 'http'; import cors from 'cors';
import { Server } from 'socket.io'; import jwt from 'jsonwebtoken'; import { DatabaseSync } from 'node:sqlite';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const db = new DatabaseSync('tg.db');
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, login TEXT UNIQUE, name TEXT, username TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS chats(id INTEGER PRIMARY KEY, type TEXT DEFAULT 'direct', title TEXT);
CREATE TABLE IF NOT EXISTS members(chat_id INT, user_id INT, PRIMARY KEY(chat_id, user_id));
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY, chat_id INT, sender_id INT, text TEXT, created_at INTEGER);
`);

for (const col of ['reply_to INT', 'edited INT DEFAULT 0', 'deleted INT DEFAULT 0']) { try { db.exec('ALTER TABLE messages ADD COLUMN ' + col); } catch {} }

const app = express(); app.use(cors(), express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
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

app.get('/api/me', auth, (req, res) => res.json(db.prepare('SELECT id,name,username FROM users WHERE id=?').get(req.uid)));

app.get('/api/users/search', auth, (req, res) => {
  const q = `%${String(req.query.q || '').replace(/^@/, '')}%`;
  res.json(db.prepare('SELECT id,name,username FROM users WHERE id!=? AND (username LIKE ? OR name LIKE ?) LIMIT 20').all(req.uid, q, q));
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

const getMsg = (id) => db.prepare(`SELECT m.*, u.name AS sender_name, r.text AS reply_text, ru.name AS reply_name
  FROM messages m JOIN users u ON u.id=m.sender_id
  LEFT JOIN messages r ON r.id=m.reply_to LEFT JOIN users ru ON ru.id=r.sender_id WHERE m.id=?`).get(id);
const notify = (chatId, ev, payload) =>
  db.prepare('SELECT user_id FROM members WHERE chat_id=?').all(chatId).forEach((m) => io.to('user:' + m.user_id).emit(ev, payload));

app.post('/api/chats/group', auth, (req, res) => {
  const title = String(req.body.title || '').trim().slice(0, 64);
  const ids = [...new Set([req.uid, ...(req.body.userIds || []).map(Number)])]
    .filter((u) => db.prepare('SELECT 1 FROM users WHERE id=?').get(u));
  if (!title || ids.length < 2) return res.status(400).json({ error: 'Укажите название и добавьте хотя бы одного участника' });
  const id = db.prepare("INSERT INTO chats(type,title) VALUES('group',?)").run(title).lastInsertRowid;
  const add = db.prepare('INSERT INTO members VALUES(?,?)');
  ids.forEach((u) => { add.run(id, u); io.to('user:' + u).emit('chats'); });
  res.json({ id });
});

app.get('/api/chats', auth, (req, res) => {
  res.json(db.prepare(`SELECT c.id, c.type,
      CASE WHEN c.type='group' THEN c.title ELSE p.name END AS name,
      CASE WHEN c.type='group' THEN NULL ELSE p.username END AS username,
      (SELECT COUNT(*) FROM members WHERE chat_id=c.id) AS members_count,
      (SELECT CASE WHEN deleted=1 THEN 'Сообщение удалено' ELSE text END FROM messages WHERE chat_id=c.id ORDER BY id DESC LIMIT 1) AS last_text,
      COALESCE((SELECT created_at FROM messages WHERE chat_id=c.id ORDER BY id DESC LIMIT 1), 0) AS last_at
    FROM chats c JOIN members m ON m.chat_id=c.id AND m.user_id=?
    LEFT JOIN users p ON c.type='direct' AND p.id=(SELECT user_id FROM members WHERE chat_id=c.id AND user_id!=? LIMIT 1)
    ORDER BY last_at DESC, c.id DESC`).all(req.uid, req.uid));
});

app.get('/api/chats/:id/messages', auth, (req, res) => {
  if (!isMember(req.params.id, req.uid)) return res.status(403).json({ error: 'Нет доступа' });
  const ids = db.prepare('SELECT id FROM messages WHERE chat_id=? ORDER BY id DESC LIMIT 500').all(req.params.id);
  res.json(ids.reverse().map((r) => getMsg(r.id)));
});

// --- Реалтайм ---
io.use((s, next) => {
  try { s.uid = jwt.verify(s.handshake.auth.token, SECRET).id; next(); } catch { next(new Error('auth')); }
});
io.on('connection', (s) => {
  s.join('user:' + s.uid);
  const clean = (t) => String(t || '').trim().slice(0, 4000);
  s.on('message', ({ chatId, text, replyTo }) => {
    text = clean(text);
    if (!text || !isMember(chatId, s.uid)) return;
    const ok = replyTo && db.prepare('SELECT 1 FROM messages WHERE id=? AND chat_id=?').get(replyTo, chatId);
    const id = db.prepare('INSERT INTO messages(chat_id,sender_id,text,created_at,reply_to) VALUES(?,?,?,?,?)')
      .run(chatId, s.uid, text, Date.now(), ok ? replyTo : null).lastInsertRowid;
    notify(chatId, 'message', getMsg(id));
  });
  s.on('edit', ({ id, text }) => {
    text = clean(text);
    const m = db.prepare('SELECT chat_id FROM messages WHERE id=? AND sender_id=? AND deleted=0').get(id, s.uid);
    if (!m || !text) return;
    db.prepare('UPDATE messages SET text=?, edited=1 WHERE id=?').run(text, id);
    notify(m.chat_id, 'message:update', getMsg(id));
  });
  s.on('delete', ({ id }) => {
    const m = db.prepare('SELECT chat_id FROM messages WHERE id=? AND sender_id=?').get(id, s.uid);
    if (!m) return;
    db.prepare("UPDATE messages SET deleted=1, text='' WHERE id=?").run(id);
    notify(m.chat_id, 'message:update', getMsg(id));
  });
  s.on('typing', ({ chatId }) => {
    if (!isMember(chatId, s.uid)) return;
    db.prepare('SELECT user_id FROM members WHERE chat_id=? AND user_id!=?').all(chatId, s.uid)
      .forEach((m) => io.to('user:' + m.user_id).emit('typing', { chatId, userId: s.uid }));
  });
});

server.listen(3001, () => console.log('Сервер: http://localhost:3001'));
