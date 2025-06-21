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
      console.log(`User ${userId} joined their room`);
      socket.join(userId);
    });

    socket.on('send_message', async (data) => {
      const { senderId, receiverId, content, fromApi, message } = data;

      if (fromApi && message) {
        // API already saved it, just emit
        socket.to(receiverId).emit('new_message', message);
      } else {
        // Save and emit (for potential fallback/internal use)
        const savedMessage = await prisma.message.create({
          data: { senderId, receiverId, content }
        });
        socket.to(receiverId).emit('new_message', savedMessage);
      }
    });
  });
}).catch((err) => {
  console.error('❌ Failed to initialize socket server:', err.message);
});


