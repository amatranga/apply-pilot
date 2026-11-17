import { Worker } from "bullmq";
import IORedis from "ioredis";
import { JSearchAdapter, executeDiscovery } from "@applypilot/discovery";

const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });
const key = process.env.JSEARCH_KEY;

if (!key) throw new Error("JSEARCH_KEY is required");

const adapter = new JSearchAdapter(key);
const worker = new Worker("discovery", async job => {
  await executeDiscovery(job.data.runId as string, adapter);
}, { connection: redis, concurrency: 2 });

worker.on("failed", (job, error) => 
  console.error("Discovery failed", job?.id, error)
);

process.on("SIGTERM", async () => { 
  await worker.close();
  await redis.quit();
});
