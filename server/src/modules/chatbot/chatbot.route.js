import express from 'express';
const router = express.Router();
import chatbotController from './chatbot.controller.js';
import auth from '../../middlewares/auth.js';

router.post('/query',auth, chatbotController.queryChatbot);
router.post('/sync', chatbotController.syncCompanyData);

export default router;
