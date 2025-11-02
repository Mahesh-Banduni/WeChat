import { notificationQueue } from "../../queues/queue.js";
import connectionService from "./connection.service.js";
import { getSocketClient } from '../../socket/socket-client.js';
import { sendPushNotification } from "../../utils/firebase.notification.js";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sendInvite = async (req, res, next) => {
  try {
    const senderId = req.user.id;
    const { email } = req.body;
    const {invite, notification} = await connectionService.sendInvite(senderId, email);

    try{
      const receiver = await prisma.user.findFirst({
        where: { email },
      });
    
      if (!receiver) {
        socket.emit('invite_error', { message: 'User not found' });
        return;
      }
      const receiverId = receiver.userId;
      const title="New invite";
      const body=notification.message;
      await notificationQueue.add('notfication', {
        receiverId, notificationData: notification
      },{
        attempts:2,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: true
      });
      //sendPushNotification(receiverId, notification);
      }
    catch(error){
      console.warn('⚠️ Failed to send push notification:', error.message);
    }

    // // Emit to Socket.IO server
    // try {
    //   const socket = getSocketClient();
    //   socket.emit('send_invite', {
    //     senderId,
    //     email,
    //     fromApi: true,
    //     invite: invite, // Pass full saved invite
    //     notification: notification
    //   });
    // } catch (err) {
    //   console.warn('⚠️ Failed to emit via socket client:', err.message);
    // }

    res.status(201).json({
        message: "Invite sent successfully",
        invite,
    });
  } catch (error) {
    next(error);
  }
};

const handleInvite = async (req, res, next) => {
 try{
  const inviteId = req.params.id;
  const userId = req.user.id;
  const { status } = req.body;
  const {invite, notification} = await connectionService.handleInvite(inviteId, userId, status);

    if(status === 'ACCEPTED') {
      try {
        const existingInvite = await prisma.invite.findUnique({
          where: { inviteId },
        });

        if (!existingInvite) {
          socket.emit('invite_error', { message: 'Invite not found' });
          return;
        }
      
        const senderId = existingInvite.senderId;
      const title="Invitation Accepted";
      const body=notification.message;
      await notificationQueue.add('notfication', {
        receiverId: senderId, notificationData: notification
      },{
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: true
      });
      //sendPushNotification(senderId, notification);
      }
    catch(error){
      console.warn('⚠️ Failed to send push notification:', error.message);
    }
       // Emit to Socket.IO server
    // try {
    //   const socket = getSocketClient();
    //   socket.emit('accept_invite', {
    //     inviteId,
    //     userId,
    //     fromApi: true,
    //     invite: invite, // Pass full saved result
    //     notification: notification
    //   });
    // } catch (err) {
    //   console.warn('⚠️ Failed to emit via socket client:', err.message);
    // }
      res.status(200).json({
        message: "Invite accepted successfully",
        invite,
      });
    }
    else if(status === 'REJECTED') {
      res.status(200).json({
        message: "Invite rejected successfully",
        invite,
      });
    }
 }
 catch (error) {
  next(error);
 }
};

const allInvites = async (req, res, next) => {
 try{
  const userId = req.user.id;
  const result = await connectionService.allInvites(userId);
  res.status(200).json({
      message: "List of invites retrieved successfully",
      result,
    });
 }
 catch (error) {
  next(error);
 }
};

const allConnections = async (req, res, next) => {
 try{
  const userId = req.user.id;
  const result = await connectionService.allConnections(userId);
  res.status(200).json({
      message: "List of connections retrieved successfully",
      result,
    });
 }
 catch (error) {
  next(error);
 }
};

const getInviteById = async (req, res, next) => {
  try {
    const inviteId = req.params.id;
    const userId = req.user.id;
    const invite = await connectionService.getInviteById(inviteId, userId);
    res.status(200).json({
      message: "Invite retrieved successfully",
      invite,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  sendInvite,
  handleInvite,
  allInvites,
  allConnections,
  getInviteById
};
