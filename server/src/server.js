// src/app.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';
import userRoutes from './routes/user.route.js';
import connectionRoutes from './routes/connection.route.js';
import errorHandler from './middlewares/error.handler.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(async (req, res, next) => {
  try {
    if (!isSocketInitialized()) {
      throw new Error('Socket.IO not ready');
    }
    req.io = getSocketInstance(); // 👈 here
    next();
  } catch (err) {
    res.status(503).json({ 
      error: "Real-time service initializing",
      message: err.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/user', userRoutes);
app.use('/api/connection', connectionRoutes);

app.use(errorHandler);

export default app;
