// message.service.js
import { PrismaClient } from "@prisma/client";
import { NotFoundError, BadRequestError } from "../errors/errors.js";

const prisma = new PrismaClient();

const sendMessage = async (senderId, receiverId, content) => {
  // Validate users exist
  const [sender, receiver] = await Promise.all([
    prisma.user.findUnique({ where: { userId: senderId } }),
    prisma.user.findUnique({ where: { userId: receiverId } })
  ]);

  if (!sender || !receiver) {
    throw new NotFoundError("User not found");
  }

  // Create and return message
  return await prisma.message.create({
    data: { 
      senderId, 
      receiverId, 
      content,
      createdAt: new Date() 
    },
    include: {
      sender: { select: { name: true } },
      receiver: { select: { name: true } }
    }
  });
};

const loadMessages = async (senderId, receiverId) => {
  return await prisma.message.findMany({
    where: {
      OR: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
};

const getLatestMessagesAndUnreadCount = async (userId) => {
    // 1. Get all connections for the user
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { userAId: userId },
          { userBId: userId }
        ]
      },
      include: {
        userA: {
          select: {
            userId: true,
            name: true,
            email: true
          }
        },
        userB: {
          select: {
            userId: true,
            name: true,
            email: true
          }
        }
      }
    });

    // 2. Extract connected user IDs
    const connectedUserIds = connections.map(conn => 
      conn.userAId === userId ? conn.userBId : conn.userAId
    );

    // 3. Get latest message for each conversation
    const latestMessages = await prisma.message.findMany({
      where: {
        OR: [
          { 
            senderId: userId, 
            receiverId: { in: connectedUserIds } 
          },
          { 
            senderId: { in: connectedUserIds }, 
            receiverId: userId 
          }
        ]
      },
      orderBy: { 
        createdAt: 'desc' 
      },
      distinct: ['senderId', 'receiverId']
    });

    // 4. Get unread message counts
    const unreadCounts = await prisma.message.groupBy({
      by: ['senderId'],
      where: {
        senderId: { in: connectedUserIds },
        receiverId: userId,
        status: 'SENT'
      },
      _count: {
        _all: true
      }
    });

    // Convert unread counts to a map for easy lookup
    const unreadMap = unreadCounts.reduce((map, item) => {
      map[item.senderId] = item._count._all;
      return map;
    }, {});

    // 5. Build the final results
    const results = connections.map(conn => {
      const otherUser = conn.userAId === userId ? conn.userB : conn.userA;
      
      // Find the latest message in this conversation
      const latestMsg = latestMessages.find(msg => 
        (msg.senderId === userId && msg.receiverId === otherUser.userId) ||
        (msg.senderId === otherUser.userId && msg.receiverId === userId)
      );

      return {
        user: otherUser,
        latestMessage: latestMsg || {
          messageId: null,
          content: 'Click to start chatting',
          createdAt: null,
          status: null,
          senderId: null,
          receiverId: userId
        },
        unreadCount: unreadMap[otherUser.userId] || 0
      };
    });

    // 6. Sort by most recent message first
    results.sort((a, b) => {
      const aTime = a.latestMessage?.createdAt?.getTime() || 0;
      const bTime = b.latestMessage?.createdAt?.getTime() || 0;
      return bTime - aTime; // Newest first
    });

    return results;
};

const markMessagesAsRead = async(userId, senderId)=> {
  
    // Update all messages from this sender to current user
    const updatedMessages = await prisma.message.updateMany({
      where: {
        senderId: senderId,
        receiverId: userId,
        status: 'SENT'
      },
      data: {
        status: 'READ',
      }
    });

    return updatedMessages.count;
}

export default {
  sendMessage,
  loadMessages,
  getLatestMessagesAndUnreadCount,
  markMessagesAsRead
};
