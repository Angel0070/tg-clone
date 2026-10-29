import { Icon } from './icons.jsx';

/* ---------- Утилиты ---------- */
export const EMOJI = '😀 😃 😄 😁 😆 😅 😂 🤣 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤔 😐 😏 😒 🙄 😬 😌 😔 😴 😷 🤒 🥵 🥶 🤯 🤠 😎 🤓 🧐 😕 😟 🙁 😮 😲 😳 🥺 😢 😭 😱 😖 😞 😩 😫 😤 😡 🤬 😈 💀 💩 🤡 👻 👽 🤖 👍 👎 👌 🤞 🤟 🤘 👋 🙏 💪 👏 🙌 🤝 ❤️ 🧡 💛 💚 💙 💜 🖤 💔 🔥 ✨ ⭐ 🎉 🎂 🎁 🍕 🍔 🍟 🍺 ☕ 🐶 🐱 🦊 🐻 🐼 🐸 🐵 🙈'.split(' ');
export const fmt = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
export const hm = (t) => new Date(t).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
export const dayLabel = (t) => {
  const d = new Date(t), n = new Date();
  const diff = Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
  return diff === 0 ? 'Сегодня' : diff === 1 ? 'Вчера' : d.toLocaleDateString('ru', { day: 'numeric', month: 'long' });
};
export const listTime = (t) => (!t ? '' : dayLabel(t) === 'Сегодня' ? hm(t) : new Date(t).toLocaleDateString('ru', { day: 'numeric', month: 'short' }));
export const seen = (p) => {
  if (!p) return '';
  if (p.online) return 'в сети';
  if (!p.lastSeen) return 'был(а) давно';
  if (Date.now() - p.lastSeen < 60000) return 'был(а) только что';
  const d = dayLabel(p.lastSeen);
  return d === 'Сегодня' ? `был(а) в ${hm(p.lastSeen)}` : d === 'Вчера' ? `был(а) вчера в ${hm(p.lastSeen)}` : `был(а) ${d}`;
};
export const size = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' МБ' : Math.max(1, Math.round((n || 0) / 1024)) + ' КБ');
export const dd = (t) => new Date(t).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' });
export const yrs = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'год' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'года' : 'лет');
export const bday = (d) => {
  const [y, mo, da] = d.split('-').map(Number); if (!y) return '';
  const now = new Date(); let age = now.getFullYear() - y;
  if (now < new Date(now.getFullYear(), mo - 1, da)) age--;
  return `${da} ${new Date(y, mo - 1, da).toLocaleDateString('ru', { month: 'long' })} (${age} ${yrs(age)})`;
};
export const ext = (name) => (String(name || 'file').split('.').pop() || 'file').slice(0, 4);
export const URL_RE = /(https?:\/\/[^\s<]+)/;
export const EMOJI_RE = /(\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)/u;
export const ONLY_EMOJI = new RegExp('^(?:' + EMOJI_RE.source + '\\s*){1,3}$', 'u');
export const emojiUrl = (e) => `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/${Array.from(e).map((c) => c.codePointAt(0).toString(16)).join('-')}.png`;
export const Emo = ({ e }) => <img className="emo" src={emojiUrl(e)} alt={e} loading="lazy" draggable="false" />;
export const Emojify = ({ text }) => text.split(EMOJI_RE).map((p, i) => (i % 2 ? <Emo key={i} e={p} /> : p));
export const isBigEmoji = (t) => ONLY_EMOJI.test(t.trim());
export const Linkify = ({ text }) => text.split(URL_RE).map((p, i) => (i % 2
  ? <a key={i} href={p} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{p}</a> : <Emojify key={i} text={p} />));
export const Ava = ({ name, url, online, icon }) => (
  <div className="avw">{url ? <img className="ava" src={url} alt="" /> : icon ? <div className="ava ico"><Icon n={icon} size={26} /></div> : <div className="ava">{(name || '?')[0]}</div>}{online && <i className="odot" />}</div>);
export const twemojiUrl = (e) => {
  const cps = Array.from(e).map((c) => c.codePointAt(0).toString(16));
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${(cps.includes('200d') ? cps : cps.filter((c) => c !== 'fe0f')).join('-')}.svg`;
};
