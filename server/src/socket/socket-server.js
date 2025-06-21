// src/socket/socket-server.js
import { initializeSocket } from './socket-instance.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SOCKET_PORT = process.env.SOCKET_PORT || 8080;

initializeSocket(SOCKET_PORT).then((io) => {
  console.log('✅ Socket.IO server running on port', SOCKET_PORT);

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('join', ({ userId }) => {
      socket.join(userId);
    });

    socket.on('send_message', async (data) => {
      const { senderId, receiverId, content, fromApi } = data;

      if (fromApi) {
        socket.to(receiverId).emit('new_message', data);
        return;
      }

      const message = await prisma.message.create({
        data: { senderId, receiverId, content }
      });

      socket.to(receiverId).emit('new_message', message);
    });
  });
});
