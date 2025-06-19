// message.service.js
import { PrismaClient } from "@prisma/client";
import { NotFoundError, BadRequestError } from "../errors/errors.js";

const prisma = new PrismaClient();

const sendMessage = async (senderId, receiverId, content) => {
  const user = await prisma.user.findUnique({ where: { userId: senderId } });
  if (!user) throw new NotFoundError("User not found");

  const msg = await prisma.message.create({
    data: { senderId, receiverId, content },
  });

  if (!msg) throw new BadRequestError("Cannot send message. Please try again later.");

  return msg;
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
