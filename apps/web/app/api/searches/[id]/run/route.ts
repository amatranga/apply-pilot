import { NextResponse } from "next/server";
import { prisma } from "@applypilot/database";
import { authorized } from "../../../_lib/auth";
import { getDiscoveryQueue } from "../../../_lib/queue";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const saved = await prisma.savedSearch.findUnique({ where: { id } });

  if (!saved || !saved.enabled) return NextResponse.json({ error: "Search unavailable" }, { status: 404 });

  const run = await prisma.discoveryRun.create({ data: { savedSearchId: id } });

  try {
    await getDiscoveryQueue().add("discover", { runId: run.id }, { jobId: run.id, attempts: 1, removeOnComplete: 100 });
  } catch {
    await prisma.discoveryRun.update({
      where: { id: run.id }, 
      data: { status: "FAILED", error: "Queue unavailable", completedAt: new Date() }
    });
    
    return NextResponse.json({ error: "Queue unavailable" }, { status: 503 });
  }
  
  return NextResponse.json({ runId: run.id, status: "QUEUED" }, { status: 202 });
}
