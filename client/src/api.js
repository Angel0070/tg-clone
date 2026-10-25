export const getToken = () => localStorage.getItem('token');
export async function api(path, body, method) {
  const r = await fetch('/api' + path, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
    body: body ? JSON.stringify(body) : undefined });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Ошибка');
  return data;
}
export async function uploadFile(file) {
  const r = await fetch('/api/upload', { method: 'POST', body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream', Authorization: 'Bearer ' + getToken(), 'X-File-Name': encodeURIComponent(file.name || 'file') } });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Не удалось загрузить файл');
  return d;
}
export const upload = async (blob) => (await uploadFile(blob)).url;
