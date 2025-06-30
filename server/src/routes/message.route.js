import express from 'express';
import messageController from '../controllers/message.controller.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

router.post('/send', auth, messageController.sendMessage);
router.get('/load', auth, messageController.loadMessages);
router.get('/latest', auth, messageController.getLatestMessagesAndUnreadCount);
router.post('/mark-read', auth, messageController.markMessagesAsRead);

export default router;
