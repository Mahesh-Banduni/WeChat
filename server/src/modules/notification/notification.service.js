import { NotFoundError, BadRequestError, ConflictError } from "../../errors/errors.js";
import { PrismaClient } from "@prisma/client";
import { storeToken } from "../../utils/firebase.notification.js";

const prisma = new PrismaClient();

const storeFirebaseToken = async(userId, token) =>{
  const result = await storeToken(userId, token);
  return result;
}

const loadNotifications = async (userId) => {
  const notifications = await prisma.notification.findMany({
    where: {
      userId
    },
    orderBy: { createdAt: 'desc' },
  });
  return notifications;
};

const markNotificationAsRead = async (notificationId, userId) => {
  const checkNotification = await prisma.notification.findUnique({
    where:{
      notificationId,
      userId
    }
  });
  if(!checkNotification){
    throw new NotFoundError("Notification not found");
  }
  const updatedNotification = await prisma.notification.update({
    where:{
      notificationId,
      userId
    },
    data:{
      isRead: true
  }
  });
  return updatedNotification;
}

const markAllNotificationsAsRead = async (userId) => {
  // const checkNotification = await prisma.notification.findUnique({
  //   where:{
  //     notificationId,
  //     userId
  //   }
  // });
  // if(!checkNotification){
  //   throw new NotFoundError("Notification not found");
  // }
  const updatedNotification = await prisma.notification.updateMany({
    where:{
      userId,
      isRead: false
    },
    data:{
      isRead: true
  }
  });
  return updatedNotification;
}

export default {storeFirebaseToken, loadNotifications, markNotificationAsRead, markAllNotificationsAsRead};