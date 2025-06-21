// src/controllers/message.controller.js
import messageService from "../services/message.service.js";
import { getSocketClient } from '../socket/socket-client.js';

const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    // Save message to DB
    const msg = await messageService.sendMessage(senderId, receiverId, content);

    // Emit to Socket.IO server
    try {
      const socket = getSocketClient();
      socket.emit('send_message', {
        senderId,
        receiverId,
        content,
        fromApi: true,
        message: msg, // Pass full saved message
      });
    } catch (err) {
      console.warn('⚠️ Failed to emit via socket client:', err.message);
    }

    res.json(msg);
  } catch (err) {
    next(err);
  }
};


const loadMessages = async (req, res, next) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.query;
    if (!receiverId) return res.status(400).json({ error: "receiverId is required" });

    const msgs = await messageService.loadMessages(senderId, receiverId);
    res.json(msgs);
  } catch (error) {
    next(error);
  }
};

export default {
  sendMessage,
  loadMessages,
};
