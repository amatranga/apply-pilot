import { NextResponse } from "next/server";
import { prisma } from "@applypilot/database";
import { SearchQuerySchema } from "@applypilot/discovery";
import { z } from "zod";
import { authorized } from "../_lib/auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = z.object({ name: z.string().min(1).max(100), query: SearchQuerySchema }).parse(await request.json());
    const saved = await prisma.savedSearch.create({ data: body });
    return NextResponse.json(saved, { status: 201 });
  } catch { return NextResponse.json({ error: "Invalid search" }, { status: 400 }); }
}
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ searches: await prisma.savedSearch.findMany({ orderBy: { createdAt: "desc" }, take: 100 }) });
}
