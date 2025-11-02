import express from 'express';
const router = express.Router();
import connectionController from './connection.controller.js';
import auth from '../../middlewares/auth.js';

router.post('/send-invite', auth, connectionController.sendInvite);
router.post('/handle-invite/:id', auth, connectionController.handleInvite);
router.get('/invites',auth, connectionController.allInvites);
router.get('/all',auth, connectionController.allConnections);
router.get('/invite/:id', auth, connectionController.getInviteById);

export default router;
