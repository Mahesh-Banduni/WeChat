// src/app.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.route.js';
import messageRoutes from './modules/message/message.route.js';
import userRoutes from './modules/user/user.route.js';
import connectionRoutes from './modules/connection/connection.route.js';
import notificationRoutes from './modules/notification/notification.route.js';
import errorHandler from './middlewares/error.handler.js';
import { sendPushNotification } from './utils/firebase.notification.js';
import { redisQueue } from './queues/queue.js';
import chatBotRoutes from './modules/chatbot/chatbot.route.js';
import analyticsRoutes from './modules/analytics/analytics.route.js';
import './cronScheduler.js'; 

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/add-job', async (req, res) => {
  const job = await redisQueue.add('task 1', {
    name: req.body.name || 'Default Name',
    timestamp: Date.now(),
  });
  console.log(`Job added to job queue. User: ${req.body.name}`)
  res.json({ jobId: job.id });
});

// for(let i=0; i<=1000; i++){
// const job = await redisQueue.add(`Task ${i}`, {
//     name: `I am task no. ${i}`,
//     timestamp: Date.now(),
//   });
//   console.log(`Job added to job queue. User: ${req.body.name}, Job: ${job.id}`)
//   //res.json({ jobId: job.id });
// }

app.get('/api/health', (req, res) => {
  console.log("health");
  const receiverId='94325a53-373f-4600-9ebd-46b7a183ded7';
  const title="New invite";
  const body="hello";
  sendPushNotification(receiverId, title, body);
  console.log("Success");
  res.json({ status: 'API is running' });

});

app.use('/api/auth', authRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/user', userRoutes);
app.use('/api/connection', connectionRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/chatbot', chatBotRoutes);
app.use('/api/analytics',analyticsRoutes);

app.use(errorHandler);

export default app;
