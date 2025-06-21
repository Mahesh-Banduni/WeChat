// src/socket/socket-client.js
import { io } from 'socket.io-client';

let socket = null;

export function initSocketClient(socketServerUrl) {
  if (socket) return socket;

  socket = io(socketServerUrl, {
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('✅ Socket client connected to', socketServerUrl);
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Socket client connection error:', err.message);
  });

  return socket;
}

export function getSocketClient() {
  if (!socket) throw new Error('Socket client not initialized');
  return socket;
}
