import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { BadRequestError } from '../errors/errors.js';
import { sendOnboardingEmailforUser } from '../utils/emailHandler.js';
import { sendPushNotification } from '../utils/firebase.notification.js';

// ✅ Configure Redis with required options
console.log(`[Worker ${process.pid}] Connecting to Redis...`);
const connection = new IORedis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null,  // 🔑 Required by BullMQ
  enableReadyCheck: false      // Optional
});

connection.on('connect', () => {
  console.log(`[Worker ${process.pid}] Redis connection established.`);
});

connection.on('error', (err) => {
  console.error(`[Worker ${process.pid}] Redis connection error: ${err.message}`);
});

// Notification Worker for notificationQueue
const notificationWorker = new Worker(
  'notificationQueue',
  async (job) => {
    console.log(`[Notification Worker ${process.pid}] 🔄 Processing notification job ${job.id}`);

    try {
      const response = await sendPushNotification(job.data.receiverId, job.data.notificationData);
      console.log(`[Notification Worker ${process.pid}] 📧 Notification response:`, response.message);

      if (response.success === false) {
        const errorMessage = `Failed to send notification: ${response.error}`;
        console.warn(errorMessage);
        throw new BadRequestError(errorMessage);
      }

    } catch (error) {
      console.log(error);
      console.error(`[Notification Worker ${process.pid}] ❌ Error in processing notification job ${job.id}: ${error.message}`);
      throw error; // Re-throw for BullMQ to register as failed
    }
  },
  {
    connection,
    concurrency: 50 // Process 50 notification jobs in parallel
  }
);

// Notification Worker Events
notificationWorker.on('completed', (job) => {
  console.log(`[Notification Worker ${process.pid}] 🎉 Notification job ${job.id} completed.`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`[Notification Worker ${process.pid}] ❌ Notification job ${job?.id} failed: ${err.message}`);
});

console.log(`[Worker ${process.pid}] 🚀 Workers started and listening for jobs...`);
