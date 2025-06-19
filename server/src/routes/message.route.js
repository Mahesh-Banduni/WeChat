import express from 'express';
import messageController from '../controllers/message.controller.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

router.post('/send', auth, messageController.sendMessage);
router.get('/history', auth, messageController.loadMessages);

export default router;
