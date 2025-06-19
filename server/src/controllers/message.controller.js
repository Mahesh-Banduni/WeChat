// controller.js
import messageService from "../services/message.service.js";

const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;
    const msg = await messageService.sendMessage(senderId, receiverId, content);
    req.io.to(receiverId).emit("new_message", msg); // Push to receiver
    res.json(msg);
  } catch (error) {
    next(error);
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
