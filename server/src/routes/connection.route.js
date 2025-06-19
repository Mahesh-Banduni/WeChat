import express from 'express';
const router = express.Router();
import connectionController from '../controllers/connection.controller.js';
import auth from '../middlewares/auth.js';

router.post('/send-invite', auth, connectionController.sendInvite);
router.post('/accept-invite/:id', auth, connectionController.acceptInvite);
router.get('/invites',auth, connectionController.allInvites);
router.get('/all',auth, connectionController.allConnections);

export default router;
