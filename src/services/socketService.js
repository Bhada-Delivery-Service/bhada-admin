import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;
const connectListeners = new Set();

export function onSocketConnect(fn) {
  connectListeners.add(fn);
  if (socket?.connected) fn(socket);
  return () => connectListeners.delete(fn);
}

export function connectSocket(token) {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[WS:Admin] Connected —', socket.id);
    socket.emit('ping');
    connectListeners.forEach(fn => fn(socket));
  });

  socket.on('disconnect', (reason) => {
    console.warn('[WS:Admin] Disconnected —', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[WS:Admin] Connection error —', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  // Do NOT clear connectListeners — TrackingPage's onSocketConnect subscription
  // must survive token refresh so it re-registers after reconnect.
}

export function getSocket() {
  return socket;
}