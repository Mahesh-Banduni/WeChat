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
    throw new Error("User not found");
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
    orderBy: { createdAt: 'asc' },
  });
};

export default {
  sendMessage,
  loadMessages,
};
