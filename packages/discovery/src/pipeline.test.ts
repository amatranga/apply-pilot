import { describe, expect, it } from "vitest";
import { filterRecent } from "./pipeline";
import type { NormalizedJob, SearchQuery } from "./types";

const query: SearchQuery = { keywords: "Software Engineer", country: "us", remoteOnly: true, postedWithinHours: 24, maxPages: 1 };

const job = (hoursAgo: number, workplaceType: NormalizedJob["workplaceType"] = "REMOTE"): NormalizedJob => ({
  provider: "test", 
  externalId: String(hoursAgo), 
  title: "Engineer", 
  company: "Example", 
  description: null, 
  location: null, 
  workplaceType,
  postedAt: new Date(Date.parse("2026-11-05T18:00:00Z") - hoursAgo * 3_600_000), 
  sourceUrl: null, 
  applyUrl: null,
});
describe("filterRecent", () => {
  it("filters stale, future and non-remote jobs", () => {
    const now = new Date("2026-11-05T18:00:00Z");
    expect(filterRecent([job(2), job(25), job(-1), job(1, "UNKNOWN")], query, now).map(j => j.externalId)).toEqual(["2"]);
  });
});
