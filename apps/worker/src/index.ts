import { Worker } from "bullmq";
import IORedis from "ioredis";
import { JSearchAdapter, executeDiscovery } from "@applypilot/discovery";
import { prisma } from "@applypilot/database";
import { Queue } from "bullmq";

const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });
const key = process.env.JSEARCH_KEY ?? process.env.RAPIDAPI_KEY;

if (!key) throw new Error("JSEARCH_KEY is required");

const adapter = new JSearchAdapter(key);
const worker = new Worker("discovery", async job => {
  await executeDiscovery(job.data.runId as string, adapter);
}, { connection: redis, concurrency: 2 });

worker.on("failed", (job, error) => console.error("Discovery failed", job?.id, error));
process.on("SIGTERM", async () => { 
  await worker.close(); 
  await redis.quit(); 
});

// Polling scheduler. Disabled unless explicitly enabled, to avoid unexpected API costs.
const scheduleQueue = new Queue("discovery", { connection: redis });
let scheduling = false;

async function scheduleDueSearches() {
  if (scheduling) return;

  scheduling = true;

  try {
    const now = new Date();
    const due = await prisma.savedSearch.findMany({
      where: { enabled: true, nextRunAt: { lte: now } },
      orderBy: { nextRunAt: "asc" }, take: 20,
    });

    for (const search of due) {
      // Atomic conditional claim prevents two scheduler processes claiming same due time.
      const claim = await prisma.savedSearch.updateMany({
        where: { id: search.id, enabled: true, nextRunAt: search.nextRunAt },
        data: { nextRunAt: new Date(now.getTime() + search.intervalMinutes * 60000), lastRunAt: now },
      });

      if (claim.count !== 1) continue;

      const run = await prisma.discoveryRun.create({ data: {
        savedSearchId: search.id, querySnapshot: search.query as object, trigger: "SCHEDULED",
      }});

      try {
        await scheduleQueue.add("discover", {runId:run.id}, {jobId:run.id, attempts:1, removeOnComplete:100});
      } catch (error) {
        await prisma.discoveryRun.update({
          where: { id: run.id }, 
          data:{ status: "FAILED", completedAt: new Date(), error:"Unable to enqueue scheduled search" }
          });

        console.error("Failed to enqueue", run.id,error);
      }
    }
  } catch(error) { 
    console.error("Scheduler error", error); 
  }
  finally { 
    scheduling=false; 
  }
}

const schedulerTimer = process.env.ENABLE_DISCOVERY_SCHEDULER === "true"
  ? setInterval(() => {void scheduleDueSearches();}, 60_000) : null;

  if (schedulerTimer) void scheduleDueSearches();

  process.on("SIGINT", async () => {
    if (schedulerTimer) clearInterval(schedulerTimer);
    
    await worker.close();
    await scheduleQueue.close();
    await redis.quit();process.exit(0);
  });
