import express from 'express';
const router = express.Router();
import authController from './auth.controller.js';

router.post('/login', authController.authUser);

export default router;
