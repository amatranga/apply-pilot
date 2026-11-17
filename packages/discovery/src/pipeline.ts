import { prisma } from "@applypilot/database";
import { SearchQuerySchema, type JobSourceAdapter, type NormalizedJob, type SearchQuery } from "./types";

export function filterRecent(jobs: NormalizedJob[], query: SearchQuery, now = new Date()) {
  const cutoff = now.getTime() - query.postedWithinHours * 3_600_000;
  
  return jobs.filter(job => {
    const postedAt = job.postedAt?.getTime();
    return postedAt !== undefined
      && postedAt >= cutoff
      && postedAt <= now.getTime()
      && (!query.remoteOnly || job.workplaceType === "REMOTE");
  });
}

export async function executeDiscovery(runId: string, adapter: JobSourceAdapter) {
  const run = await prisma.discoveryRun.findUniqueOrThrow({ where: { id: runId }, include: { savedSearch: true } });
  const query = SearchQuerySchema.parse(run.savedSearch.query);
  
  await prisma.discoveryRun.update({ where: { id: runId }, data: { status: "RUNNING", startedAt: new Date() } });
  
  try {
    const fetched = await adapter.search(query);
    const filtered = filterRecent(fetched, query);
    const unique = [...new Map(filtered.map(job => [`${job.provider}:${job.externalId}`, job])).values()];
    let newCount = 0;
    
    for (const job of unique) {
      const result = await prisma.$transaction(async tx => {
        const existing = await tx.jobSourceRecord.findUnique({
          where: { provider_externalId: { provider: job.provider, externalId: job.externalId } },
        });
        
        if (existing) {
          await tx.jobSourceRecord.update({ where: { id: existing.id }, data: { lastSeenAt: new Date(), sourceUrl: job.sourceUrl, applyUrl: job.applyUrl } });
          await tx.jobPosting.update({ where: { id: existing.jobPostingId }, data: { lastSeenAt: new Date() } });
          return false;
        }
        
        await tx.jobPosting.create({ data: {
          title: job.title, 
          company: job.company, 
          description: job.description, 
          location: job.location,
          workplaceType: job.workplaceType, 
          postedAt: job.postedAt, 
          canonicalApplyUrl: job.applyUrl,
          sources: { 
            create: { 
              provider: job.provider, 
              externalId: job.externalId, 
              sourceUrl: job.sourceUrl, 
              applyUrl: job.applyUrl 
            } 
          },
        } 
      });
        return true;
      });
      if (result) newCount++;
    }
    
    await prisma.discoveryRun.update({ 
      where: { id: runId }, 
      data: { 
        status: "COMPLETED", 
        completedAt: new Date(), 
        jobsFound: unique.length, 
        jobsNew: newCount 
      } 
    });

    return { jobsFound: unique.length, jobsNew: newCount };
  } catch (error) {
    await prisma.discoveryRun.update({ 
      where: { id: runId }, 
      data: { 
        status: "FAILED", 
        completedAt: new Date(), 
        error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error" 
      } 
    });
    throw error;
  }
}
