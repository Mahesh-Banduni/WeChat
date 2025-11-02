import firebaseAdmin from "../configs/firebaseAdmin.js";
import { NotFoundError } from "../errors/errors.js";
import IORedis from 'ioredis';
const redis = new IORedis({
  host: '127.0.0.1',
  port: 6379,
});

const toSentenceCase = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const storeToken = async (userId, token) => {
  if (!token) throw new Error('No token provided');

  const redisKey = `fcmTokens:${userId}`;
  await redis.sadd(redisKey, token);  // Add token to the Set
  await redis.expire(redisKey, 60 * 60 * 24 * 30);  // Optional TTL 30 days

  console.log(`[Redis] Added FCM token for user ${userId}`);
  return { success: true, message: 'Token stored successfully in Redis Set.' };
};

export const sendPushNotification = async (receiverId, notificationData) => {
  const redisKey = `fcmTokens:${receiverId}`;
  const tokens = await redis.smembers(redisKey);  // Get all tokens

  if (!tokens || tokens.length === 0) {
    throw new NotFoundError(404, 'No stored FCM tokens for user.');
  }

  const messagePromises = tokens.map(async (token) => {
    const message = {
      token,
      notification: {
        title: `${toSentenceCase(notificationData.type)} notification`,
        body: notificationData.message || "You have a new notification"
      },
      data: {
        notificationId: notificationData.notificationId,
        message: notificationData.message,
        userId: notificationData.userId,
        type: notificationData.type,
        isRead: String(notificationData.isRead)
      }
    };

    try {
      const response = await firebaseAdmin.messaging().send(message);
      return { success: true, response: 'Sent' };
    } catch (error) {
      console.error(`❌ Push error for token ${token}:`, error);
      return { token, success: false, error };
    }
  });

  const results = await Promise.all(messagePromises);
  return results;
};


