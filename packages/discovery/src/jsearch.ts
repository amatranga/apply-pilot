import { z } from "zod";
import type { JobSourceAdapter, NormalizedJob, SearchQuery } from "./types";

const Parameters = z.object({
  query: z.string(),
  num_pages: z.number(),
  date_posted: z.string(),
  work_from_home: z.boolean(),
  country: z.string(),
  language: z.string(),
});

const RawJob = z.object({
  job_id: z.string(),
  job_title: z.string(),
  employer_name: z.string(),
  employer_logo: z.string().nullish(),
  employer_website: z.string().nullish(),
  job_publisher: z.string().nullish(),
  job_employment_type: z.string().nullish(),
  job_employment_types: z.array(z.string()).nullish(),
  job_description: z.string().nullish(),
  job_city: z.string().nullish(),
  job_state: z.string().nullish(),
  job_country: z.string().nullish(),
  job_is_remote: z.boolean().nullish(),
  job_posted_at_datetime_utc: z.string().nullish(),
  job_apply_link: z.string().nullish(),
  job_google_link: z.string().nullish(),
});

const ResponseSchema = z.object({
  status: z.string(),
  request_id: z.string(),
  parameters: Parameters,
  data: z.object({ jobs: z.array(RawJob) }),
});

export class JSearchAdapter implements JobSourceAdapter {
  readonly provider = "jsearch";
  constructor(private apiKey: string, private fetcher: typeof fetch = fetch) {}
  async search(query: SearchQuery, signal?: AbortSignal): Promise<NormalizedJob[]> {
    const jobs: NormalizedJob[] = [];
    for (let page = 1; page <= query.maxPages; page++) {
      const params = new URLSearchParams({
        query: query.keywords, country: query.country,
        date_posted: query.postedWithinHours <= 72 ? "3days" : "week",
        page: String(page), num_pages: "1",
      });
      if (query.remoteOnly) params.set("work_from_home", "true");
      const response = await fetch(
        `https://api.openwebninja.com/jsearch/search-v2?${params}`,
        {
          headers: {
            "X-API-Key": this.apiKey,
          },
        }
      );
      // if (!response.ok) throw new Error(`JSearch HTTP ${response.status}`);
      if (!response.ok) {
        const errorBody = await response.text();

        console.error("JSearch request failed", {
          status: response.status,
          body: errorBody,
        });

        throw new Error(`JSearch HTTP ${response.status}`);
      }

      const parsed = ResponseSchema.parse(await response.json());

      if (!parsed.data.jobs.length) break;
      jobs.push(...parsed.data.jobs.map((job): NormalizedJob => ({
        provider: this.provider,
        externalId: job.job_id,
        title: job.job_title,
        company: job.employer_name,
        description: job.job_description ?? null,
        location: [job.job_city, job.job_state, job.job_country].filter(Boolean).join(", ") || null,
        workplaceType: job.job_is_remote === true ? "REMOTE" : "UNKNOWN",
        postedAt: job.job_posted_at_datetime_utc && !Number.isNaN(Date.parse(job.job_posted_at_datetime_utc))
          ? new Date(job.job_posted_at_datetime_utc) : null,
        sourceUrl: job.job_google_link ?? null,
        applyUrl: job.job_apply_link ?? null,
      })));
    }
    return jobs;
  }
}
