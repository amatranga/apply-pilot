import { Queue } from "bullmq";
import IORedis from "ioredis";
const globalQueue = globalThis as unknown as { discoveryQueue?: Queue };
export function getDiscoveryQueue() {
  return globalQueue.discoveryQueue ??= new Queue("discovery", { connection: new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null }) });
}
