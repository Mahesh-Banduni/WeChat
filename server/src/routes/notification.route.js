import express from 'express';
import notificationController from '../controllers/notification.controller.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

router.get('/all', auth, notificationController.loadNotifications);

export default router;
