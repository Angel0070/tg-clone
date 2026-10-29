let cache = null;
export const loadEmojiData = () => (cache ||= fetch('https://cdn.jsdelivr.net/npm/emoji-picker-element-data@1/ru/cldr/data.json')
  .then((r) => r.json()).then((d) => { if (!Array.isArray(d) || !d[0]?.emoji) throw new Error('bad data'); return d; }).catch(() => null));
