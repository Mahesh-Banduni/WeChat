// src/socket/socket-instance.js
import { Server } from 'socket.io';
import http from 'http';

let io = null;
let socketServer = null;

export function initializeSocket(port) {
  return new Promise((resolve, reject) => {
    if (io) {
      console.warn('⚠️ Socket.IO already initialized');
      return resolve(io);
    }

    socketServer = http.createServer();

    io = new Server(socketServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    socketServer.listen(port, () => {
      console.log(`✅ Socket.IO server running on port ${port}`);
      resolve(io);
    });

    socketServer.on('error', (err) => {
      console.error('❌ Failed to start Socket.IO server:', err);
      reject(err);
    });
  });
}

export function getSocketInstance() {
  if (!io) {
    throw new Error('Socket.IO not initialized. Make sure you only call getSocketInstance in the socket server process.');
  }
  return io;
}
