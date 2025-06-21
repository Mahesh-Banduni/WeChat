// controller.js
import messageService from "../services/message.service.js";

const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;
    
    // Save to database
    const msg = await messageService.sendMessage(senderId, receiverId, content);
    
    // Emit via Socket.IO with error handling
    try {
      req.io.emit('forward_message', {
        ...msg,
        fromApi: true
      });
    } catch (socketError) {
      console.error('Socket emit error:', socketError);
      // Continue even if socket fails
    }
    
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
