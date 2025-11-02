import express from 'express';
import notificationController from './notification.controller.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

router.post('/store', auth, notificationController.storeFirebaseToken);
router.get('/all', auth, notificationController.loadNotifications);
router.post('/:id/mark-read', auth, notificationController.markNotificationAsRead);
router.post('/mark-all-read', auth, notificationController.markAllNotificationsAsRead);

export default router;
