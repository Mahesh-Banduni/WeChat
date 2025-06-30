import { NotFoundError, BadRequestError, ConflictError } from "../errors/errors.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const loadNotifications = async (userId) => {
  return await prisma.notification.findMany({
    where: {
      userId
    },
    orderBy: { createdAt: 'asc' },
  });
};

export default {loadNotifications};