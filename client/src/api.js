export const getToken = () => localStorage.getItem('token');
const readJson = async (r, fallback) => {
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || (r.status === 413 ? 'Файл слишком большой (максимум 100 МБ)' : fallback));
  return d;
};
export async function api(path, body, method) {
  const r = await fetch('/api' + path, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
    body: body ? JSON.stringify(body) : undefined });
  return readJson(r, 'Ошибка сервера');
}
export async function uploadFile(file) {
  let r;
  try {
    r = await fetch('/api/upload', { method: 'POST', body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream', Authorization: 'Bearer ' + getToken(), 'X-File-Name': encodeURIComponent(file.name || 'file') } });
  } catch { throw new Error('Не удалось загрузить файл. Возможно, он слишком большой (максимум 100 МБ)'); }
  return readJson(r, 'Не удалось загрузить файл');
}
export const upload = async (blob) => (await uploadFile(blob)).url;
