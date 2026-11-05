import { z } from "zod";
export const SearchQuerySchema = z.object({
  keywords: z.string().trim().min(2).max(150),
  country: z.string().length(2).default("us"),
  remoteOnly: z.boolean().default(true),
  postedWithinHours: z.number().int().min(1).max(168).default(24),
  maxPages: z.number().int().min(1).max(5).default(1),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type NormalizedJob = {
  provider: string; externalId: string; title: string; company: string;
  description: string | null; location: string | null;
  workplaceType: "REMOTE" | "HYBRID" | "ONSITE" | "UNKNOWN";
  postedAt: Date | null; sourceUrl: string | null; applyUrl: string | null;
};
export interface JobSourceAdapter {
  readonly provider: string;
  search(query: SearchQuery, signal?: AbortSignal): Promise<NormalizedJob[]>;
}
