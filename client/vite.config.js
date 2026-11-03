import { defineConfig } from 'vite'; import react from '@vitejs/plugin-react';
// Обрывы WebSocket (перезагрузка страницы, перезапуск сервера) — это норма, поэтому не засоряем консоль.
const quietWs = (proxy) => {
  proxy.removeAllListeners('error'); proxy.on('error', () => {});
  proxy.removeAllListeners('proxyReqWs'); proxy.on('proxyReqWs', (_req, _q, socket) => socket.on('error', () => {}));
};
export default defineConfig({ plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3001', '/uploads': 'http://localhost:3001', '/socket.io': { target: 'http://localhost:3001', ws: true, configure: quietWs } } } });
