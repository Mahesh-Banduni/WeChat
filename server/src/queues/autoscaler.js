import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { spawn } from 'child_process';
import os from 'os';
import osu from 'os-utils';

// Redis connection
const connection = new IORedis();
const queue = new Queue('jobQueue', { connection });

// Configuration
const MAX_WORKERS = 5;
const MIN_WORKERS = 1;
const SCALE_INTERVAL = 5000; // ms
const JOBS_PER_WORKER = 50;

let currentWorkers = 0;
let workerProcesses = [];

function spawnWorker() {
  const proc = spawn('node', ['src/queues/worker.js'], { stdio: 'inherit' });
  workerProcesses.push(proc);
  currentWorkers++;
  console.log(`🟢 Spawned worker PID ${proc.pid}`);
}

function killWorker() {
  const proc = workerProcesses.pop();
  if (proc) {
    proc.kill();
    currentWorkers--;
    console.log(`🔴 Killed worker PID ${proc.pid}`);
  }
}

function getSystemStats() {
  return new Promise((resolve) => {
    osu.cpuUsage((cpuPercent) => {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMemPercent = ((totalMem - freeMem) / totalMem) * 100;

      resolve({
        cpu: cpuPercent * 100,
        memory: usedMemPercent,
      });
    });
  });
}

async function autoscale() {
  const waiting = await queue.getWaitingCount();
  const targetWorkers = Math.min(
    MAX_WORKERS,
    Math.max(MIN_WORKERS, Math.ceil(waiting / JOBS_PER_WORKER))
  );

  const { cpu, memory } = await getSystemStats();

  console.log(`\n=== Autoscaler Run @ ${new Date().toLocaleTimeString()} ===`);
  console.log(`📦 Waiting Jobs: ${waiting}`);
  console.log(`👷 Workers: ${currentWorkers} → Target: ${targetWorkers}`);
  console.log(`🧠 CPU: ${cpu.toFixed(1)}% | Memory: ${memory.toFixed(1)}%`);

  const CPU_THRESHOLD = 75;
  const MEM_THRESHOLD = 90;

  if (cpu < CPU_THRESHOLD && memory < MEM_THRESHOLD) {
    while (currentWorkers < targetWorkers) spawnWorker();
  } else {
    console.warn(`⚠️ High system usage — scaling paused`);
  }

  while (currentWorkers > targetWorkers) killWorker();
}

// Start autoscaling loop
setInterval(autoscale, SCALE_INTERVAL);

// Boot with minimum workers
for (let i = 0; i < MIN_WORKERS; i++) spawnWorker();
