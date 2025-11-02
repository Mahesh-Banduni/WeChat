import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection configuration
const connection = new IORedis();

export const redisQueue = new Queue('jobQueue', {
  connection,
});

export const emailQueue = new Queue('emailQueue', {
  connection,
});

export const emailDLQueue = new Queue('emailDLQueue', {
  connection,
},);

export const notificationQueue = new Queue('notificationQueue', {
  connection,
});

// async function enqueueJobs() {
//   for (let i = 1; i <= 1000; i++) {
//     const job = await redisQueue.add(`Task ${i}`, {
//       name: `I am task no. ${i}`,
//       value: i,
//       timestamp: Date.now(),
//     });
//     console.log(`✅ Job ${job.id} added to queue: Task ${i}`);
//   }

//   await redisQueue.close();
//   //await connection.quit();
// }

// enqueueJobs().catch((err) => {
//   console.error('❌ Error adding jobs:', err);
// });

// async function enqueue1Jobs() {
//   for (let i = 1; i <= 50; i++) {
//     const job = await emailQueue.add('email', {
//     email: "maheshbanduni9997@gmail.com"
//   });
//     console.log(`✅Email Job ${job.id} added to email queue: Task ${i}`);
//   }

//   await redisQueue.close();
//   await connection.quit();
// }

// enqueue1Jobs().catch((err) => {
//   console.error('❌ Error adding jobs:', err);
// });
