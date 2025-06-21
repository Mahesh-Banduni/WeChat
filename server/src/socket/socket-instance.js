// src/socket/socket-instance.js
import { Server } from 'socket.io';
import http from 'http';

let io;
let socketServer;

export function initializeSocket(port) {
  return new Promise((resolve) => {
    socketServer = http.createServer();
    io = new Server(socketServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    socketServer.listen(port, () => {
      console.log(`Socket.IO running on port ${port}`);
      resolve(io);
    });
  });
}

export function getSocketInstance() {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}
