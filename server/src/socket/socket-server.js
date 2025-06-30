// src/socket/socket-server.js
import { initializeSocket } from './socket-instance.js';
import { PrismaClient } from '@prisma/client';
import connectionService from "../services/connection.service.js";

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
        // Also emit to sender for real-time UI update
        socket.emit('new_message', message);
      } else {
        // Save and emit (for potential fallback/internal use)
        const savedMessage = await prisma.message.create({
          data: { senderId, receiverId, content, status: 'SENT' }
        });
        socket.to(receiverId).emit('new_message', savedMessage);
        socket.emit('new_message', savedMessage);
      }
    });

    // Handle message sent confirmation (for status updates)
    socket.on('message_sent', async (data) => {
      const { messageId, receiverId } = data;
      
      try {
        // Update message status to DELIVERED
        const updatedMessage = await prisma.message.update({
          where: { messageId },
          data: { status: 'DELIVERED' }
        });

        // Emit status update to sender
        socket.emit('message_status_update', {
          messageId,
          status: 'DELIVERED'
        });

        // Emit to receiver as well for their UI
        socket.to(receiverId).emit('message_status_update', {
          messageId,
          status: 'DELIVERED'
        });

      } catch (error) {
        console.error('Error updating message status:', error);
      }
    });

    // Handle marking messages as read
    socket.on('mark_messages_read', async (data) => {
      const { senderId, receiverId } = data;
      
      try {
        // Update all unread messages from sender to receiver
        const updatedMessages = await prisma.message.updateMany({
          where: {
            senderId: senderId,
            receiverId: receiverId,
            status: { in: ['SENT', 'DELIVERED'] }
          },
          data: {
            status: 'READ',
          }
        });

        if (updatedMessages.count > 0) {
          // Emit read confirmation to sender
          socket.to(senderId).emit('messages_read', {
            senderId,
            receiverId,
            readAt: readAt.toISOString()
          });

          // Get updated messages for status update
          const readMessages = await prisma.message.findMany({
            where: {
              senderId: senderId,
              receiverId: receiverId,
              status: 'READ',
              readAt: readAt
            },
            select: { messageId: true }
          });

          // Emit individual message status updates
          readMessages.forEach(msg => {
            socket.to(senderId).emit('message_status_update', {
              messageId: msg.messageId,
              status: 'READ',
            });
          });
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle when user comes online/opens chat (for automatic read)
    socket.on('user_online', async (data) => {
      const { userId } = data;
      
      // Notify all connected users that this user is online
      socket.broadcast.emit('user_status_update', {
        userId,
        status: 'online',
        lastSeen: new Date().toISOString()
      });
    });

    // Handle when user goes offline
    socket.on('user_offline', async (data) => {
      const { userId } = data;
      
      // Update last seen and notify others
      socket.broadcast.emit('user_status_update', {
        userId,
        status: 'offline',
        lastSeen: new Date().toISOString()
      });
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { senderId, receiverId } = data;
      socket.to(receiverId).emit('user_typing', {
        userId: senderId,
        typing: true
      });
    });

    socket.on('typing_stop', (data) => {
      const { senderId, receiverId } = data;
      socket.to(receiverId).emit('user_typing', {
        userId: senderId,
        typing: false
      });
    });

    socket.on('send_invite', async (data) => {
      const { senderId, email, fromApi, invite } = data;
      
      try {
        const receiver = await prisma.user.findFirst({
          where: { email },
        });
      
        if (!receiver) {
          socket.emit('invite_error', { message: 'User not found' });
          return;
        }

        const receiverId = receiver.userId; 

        if (fromApi && invite) {
          // API already saved it, just emit
          socket.to(receiverId).emit('new_invite', invite);
        } else {
          // Save and emit (for potential fallback/internal use)
          const savedInvite = await connectionService.sendInvite(senderId, email);
          socket.to(receiverId).emit('new_invite', savedInvite);
        }
      } catch (error) {
        console.error('Error sending invite:', error);
        socket.emit('invite_error', { message: 'Failed to send invite' });
      }
    });

    socket.on('accept_invite', async (data) => {
      const { inviteId, userId, fromApi, invite } = data;

      try {
        const existingInvite = await prisma.invite.findUnique({
          where: { inviteId },
        });

        if (!existingInvite) {
          socket.emit('invite_error', { message: 'Invite not found' });
          return;
        }
      
        const senderId = existingInvite.senderId; 

        if (fromApi && invite) {
          // API already saved it, just emit
          socket.to(senderId).emit('accepted_invite', invite);
        } else {
          // Save and emit (for potential fallback/internal use)
          const savedInvite = await connectionService.acceptInvite(inviteId, userId);
          socket.to(senderId).emit('accepted_invite', savedInvite);
        }
      } catch (error) {
        console.error('Error accepting invite:', error);
        socket.emit('invite_error', { message: 'Failed to accept invite' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}).catch((err) => {
  console.error('❌ Failed to initialize socket server:', err.message);
});