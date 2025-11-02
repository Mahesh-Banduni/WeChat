import express from 'express';
import analyticsController from './analytics.controller.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

router.get('/chats/:id', analyticsController.getMostChattedUser);
router.get('/connections/:id', analyticsController.getUserConnections);
router.get('/connectionsbyname/:id', analyticsController.getConnectionDateByName);

export default router;