import { Worker } from 'bullmq';
import IORedis from 'ioredis';

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

// General Worker for jobQueue
const worker = new Worker(
  'jobQueue',
  async (job) => {
    console.log(`[Worker ${process.pid}] 🔄 Processing job ${job.id} | Name: ${job.data.name} | Value: ${job.data.value}`);
    
    //⏳ Simulate 5-second processing
    //await new Promise((res) => setTimeout(res, 5000));

    console.log(`[Worker ${process.pid}] ✅ Finished processing job ${job.id}`);
    return { processed: true };
  },
  {
    connection,
    concurrency: 10, // Process 10 jobs in parallel
  }
);

// Worker Events
worker.on('completed', (job) => {
  console.log(`[Worker ${process.pid}] 🎉 Job ${job.id} completed.`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker ${process.pid}] ❌ Job ${job?.id} failed: ${err.message}`);
});

console.log(`[Worker ${process.pid}] 🚀 Workers started and listening for jobs...`);
