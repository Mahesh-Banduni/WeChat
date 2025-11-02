import { NotFoundError, BadRequestError, ConflictError } from "../../errors/errors.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const getMostChattedUser = async (userId) => {
  // Group messages by the "other user"
  const messages = await prisma.message.groupBy({
    by: ["senderId", "receiverId"],
    where: {
      OR: [
        { senderId: userId },
        { receiverId: userId }
      ]
    },
    _count: {
      _all: true
    }
  });

  if (!messages.length) {
    throw new NotFoundError("No messages found for this user.");
  }

  // Calculate message counts against each "other user"
  const counts = {};
  for (const m of messages) {
    const otherUserId = m.senderId === userId ? m.receiverId : m.senderId;
    counts[otherUserId] = (counts[otherUserId] || 0) + m._count._all;
  }

  // Find the user with the max count
  let mostChattedUserId = null;
  let maxCount = 0;
  for (const [otherUserId, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      mostChattedUserId = otherUserId;
    }
  }

  // Fetch user info for that ID
  const mostChattedUser = await prisma.user.findUnique({
    where: { userId: mostChattedUserId }
  });

  return {
    userId: mostChattedUser.userId,
    name: mostChattedUser.name,
    email: mostChattedUser.email,
    messageCount: maxCount
  };
};

const getUserConnections = async (userId) => {
  // Find connections where the user is either userA or userB
  const connections = await prisma.connection.findMany({
    where: {
      OR: [
        { userAId: userId },
        { userBId: userId }
      ]
    },
    include: {
      userA: true,
      userB: true
    },
    orderBy: { createdAt: "desc" } // most recent connections first
  });

  if (!connections.length) {
    throw new NotFoundError("No connections found for this user.");
  }

  // Map connections to show the other user and the connected since time
  return connections.map((conn) => {
    const connectedUser = conn.userAId === userId ? conn.userB : conn.userA;
    return {
      connectionId: conn.connectionId,
      connectedUserId: connectedUser.userId,
      connectedUserName: connectedUser.name,
      connectedSince: conn.createdAt
    };
  });
};

const getConnectionDateByName = async (userId, otherUserName) => {
  // Find users matching the partial name
  const otherUsers = await prisma.user.findMany({
    where: {
      name: {
        contains: otherUserName,
        mode: "insensitive" // case-insensitive
      }
    }
  });

  if (!otherUsers.length) {
    throw new NotFoundError(`No user found with name like "${otherUserName}".`);
  }

  // For each matching user, check if a connection exists
  let results = await Promise.all(
    otherUsers.map(async (otherUser) => {
      const connection = await prisma.connection.findFirst({
        where: {
          OR: [
            { userAId: userId, userBId: otherUser.userId },
            { userAId: otherUser.userId, userBId: userId }
          ]
        }
      });

      if (!connection) return null;

      return {
        connectionId: connection.connectionId,
        connectedUserId: otherUser.userId,
        connectedUserName: otherUser.name,
        connectedSince: connection.createdAt
      };
    })
  );

  return results= results.filter(Boolean);
}

export default {
  getMostChattedUser,
  getUserConnections,
  getConnectionDateByName
};