import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { BadRequestError } from '../errors/errors.js';
import { sendOnboardingEmailforUser } from '../utils/emailHandler.js';
import { emailDLQueue } from './queue.js';

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

// Email Worker for emailDLQueue
const deadEmailWorker = new Worker(
  'emailDLQueue',
  async (job) => {
    console.log(`[Dead Email Worker ${process.pid}] 🔄 Retrying dead email job ${job.id}`);

    const response = await sendOnboardingEmailforUser(job.data.email);
    console.log(`[Dead Email Worker ${process.pid}] 📧 Dead Email response:`, response.message);

    if (response.success === false) {
      const errorMessage = `Failed to send onboarding email (DLQ): ${response.error}`;
      console.warn(errorMessage);
      throw new BadRequestError(errorMessage);
    }
  },
  {
    connection,
    concurrency: 50
  }
);

deadEmailWorker.on('completed', (job) => {
  console.log(`[Dead Email Worker ${process.pid}] 🎉 Dead Email job ${job.id} completed.`);
});

deadEmailWorker.on('failed', (job, err) => {
  console.error(`[Dead Email Worker ${process.pid}] ❌ Dead Email job ${job?.id} failed: ${err.message}`);
  // Optional: alert admin, log to monitoring system
});

console.log(`[Worker ${process.pid}] 🚀 Workers started and listening for jobs...`);
