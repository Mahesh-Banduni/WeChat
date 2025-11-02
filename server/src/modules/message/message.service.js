// message.service.js
import { PrismaClient } from "@prisma/client";
import { NotFoundError, BadRequestError } from "../../errors/errors.js";
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../../utils/redisClient.js';
import {uploadMultipleFilesToB2} from '../../utils/fileUpload.js'

const prisma = new PrismaClient();

const sendMessage = async (senderId, receiverId, content, messageType, files) => {
  // Validate users exist
  const [sender, receiver] = await Promise.all([
    prisma.user.findUnique({ where: { userId: senderId } }),
    prisma.user.findUnique({ where: { userId: receiverId } })
  ]);

  if (!sender || !receiver) {
    throw new NotFoundError("User not found");
  }

  // If type is FILE or IMAGE, upload files
  let urls = [];

  if (messageType === 'FILE' || messageType === 'IMAGE' || messageType === 'VIDEO') {
    console.log("Files",files);
    urls = await uploadMultipleFilesToB2(files);
  }

  const messages = [];

  // One message per URL
  for (const url of urls.length ? urls : [null]) {
    const messageId = uuidv4();

    const messageData = {
      messageId,
      senderId,
      receiverId,
      content: url || content, // if no URL, use plain content
      status: 'SENT',
      type: messageType || 'TEXT',
      createdAt: new Date().toISOString(),
    };

    await redisClient.rpush('chat:message:queue', JSON.stringify(messageData));
    messages.push(messageData);
  }

  return messages; // Return all messages created
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

const flushMessages = async () => {
  const messages = [];

  while (true) {
    const raw = await redisClient.lpop('chat:message:queue');
    console.log(raw);
    if (!raw) break;
    messages.push(JSON.parse(raw));
  }

  if (messages.length > 0) {
    await prisma.message.createMany({ data: messages });
    console.log(`✅ Flushed ${messages.length} messages to DB`);
  }
};

const flushStatusUpdates = async () => {
  const updates = [];

  while (true) {
    const raw = await redisClient.lpop('chat:status:queue');
    console.log(raw);
    if (!raw) break;
    updates.push(JSON.parse(raw));
  }

  for (const update of updates) {
    await prisma.message.update({
      where: { messageId: update.messageId },
      data: { status: update.status }
    });
  }

  if (updates.length > 0) {
    console.log(`✅ Updated status for ${updates.length} messages`);
  }
};

const flushReadUpdates = async () => {
  const readUpdates = [];

  while (true) {
    const raw = await redisClient.lpop('chat:read:queue');
    console.log(raw);
    if (!raw) break;
    readUpdates.push(JSON.parse(raw));
  }

  for (const update of readUpdates) {
    await prisma.message.updateMany({
      where: {
        senderId: update.senderId,
        receiverId: update.receiverId,
        status: { in: ['SENT', 'DELIVERED'] }
      },
      data: { status: 'READ' }
    });
  }

  if (readUpdates.length > 0) {
    console.log(`✅ Marked ${readUpdates.length} messages as READ`);
  }
};

const saveChatbotMessage = async(chatSessionId, message) =>{
  const newMessage = await prisma.chatMessage.create({ data: 
    chatSessionId,
    content: message,
    role: 'user',
    createdAt: new Date() 
  });
  return newMessage;
}

export default {
  sendMessage,
  loadMessages,
  getLatestMessagesAndUnreadCount,
  markMessagesAsRead,
  flushMessages,
  flushStatusUpdates,
  flushReadUpdates,
  saveChatbotMessage
};
