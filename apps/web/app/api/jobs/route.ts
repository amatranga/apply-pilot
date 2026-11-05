import { NextResponse } from "next/server";
import { prisma } from "@applypilot/database";
import { authorized } from "../_lib/auth";
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const hours = Number(url.searchParams.get("hours") ?? 168);
  if (!Number.isInteger(hours) || hours < 1 || hours > 720) return NextResponse.json({ error: "Invalid hours" }, { status: 400 });
  const jobs = await prisma.jobPosting.findMany({ where: { postedAt: { gte: new Date(Date.now() - hours * 3_600_000) } }, orderBy: { postedAt: "desc" }, take: 100 });
  return NextResponse.json({ jobs });
}
