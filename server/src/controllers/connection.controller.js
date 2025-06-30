import connectionService from "../services/connection.service.js";
import { getSocketClient } from '../socket/socket-client.js';

const sendInvite = async (req, res, next) => {
  try {
    const senderId = req.user.id;
    const { email } = req.body;
    const invite = await connectionService.sendInvite(senderId, email);

    // Emit to Socket.IO server
    try {
      const socket = getSocketClient();
      socket.emit('send_invite', {
        senderId,
        email,
        fromApi: true,
        invite: invite, // Pass full saved invite
      });
    } catch (err) {
      console.warn('⚠️ Failed to emit via socket client:', err.message);
    }

    res.status(201).json({
        message: "Invite sent successfully",
        invite,
    });
  } catch (error) {
    next(error);
  }
};

const acceptInvite = async (req, res, next) => {
 try{
  const inviteId = req.params.id;
  const userId = req.user.id;
  const updatedInvite = await connectionService.acceptInvite(inviteId, userId);

  // Emit to Socket.IO server
    try {
      const socket = getSocketClient();
      socket.emit('accept_invite', {
        inviteId,
        userId,
        fromApi: true,
        invite: updatedInvite, // Pass full saved result
      });
    } catch (err) {
      console.warn('⚠️ Failed to emit via socket client:', err.message);
    }

  res.status(200).json({
      message: "Invite accepted successfully",
      updatedInvite,
    });
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

export default {
  sendInvite,
  acceptInvite,
  allInvites,
  allConnections
};
