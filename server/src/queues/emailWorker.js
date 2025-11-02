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

const emailWorker = new Worker(
  'emailQueue',
  async (job) => {
    console.log(`[Email Worker ${process.pid}] 🔄 Processing email job ${job.id}`);
    const response = await sendOnboardingEmailforUser(job.data.email);
    console.log(`[Email Worker ${process.pid}] 📧 Email response:`, response.message);

    if (response.success === false) {
      const errorMessage = `Failed to send onboarding email: ${response.error}`;
      console.warn(errorMessage);
      throw new BadRequestError(errorMessage);
    }
  },
  {
    connection,
    concurrency: 50
  }
);

emailWorker.on('failed', async (job, err) => {
  console.error(`[Email Worker ${process.pid}] ❌ Email job ${job?.id} failed: ${err.message}`);

  if (job.attemptsMade >= job.opts.attempts) {
    console.warn(`[Email Worker ${process.pid}] ⚰️ Moving job ${job.id} to Dead Letter Queue`);
    await emailDLQueue.add('deadEmailJob', {
      originalJobId: job.id,
      email: job.data.email,
      failedReason: err.message,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: true
    });
  }
});

console.log(`[Worker ${process.pid}] 🚀 Workers started and listening for jobs...`);
