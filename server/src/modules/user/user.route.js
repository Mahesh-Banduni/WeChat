import express from 'express';
const router = express.Router();
import userController from './user.controller.js';
import auth from '../../middlewares/auth.js';

router.post("/register", userController.createUser);
router.get("/details", auth, userController.getUserById);

export default router;