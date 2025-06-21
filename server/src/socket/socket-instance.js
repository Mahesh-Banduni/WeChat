// src/socket/socket-instance.js
import { Server } from 'socket.io';
import http from 'http';

let io = null;
let socketServer = null;

export function initializeSocket(port = process.env.SOURCE_PORT || 8080) {
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

    // ✅ Listen on process.env.SOURCE_PORT and bind to 0.0.0.0
    socketServer.listen(port, '0.0.0.0', () => {
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
