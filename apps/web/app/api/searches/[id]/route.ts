import { NextResponse } from 'next/server';
import { prisma } from '@applypilot/database';
import { SearchQuerySchema } from '@applypilot/discovery';
import { z } from 'zod';
import { authorized } from '../../_lib/auth';
export const runtime = 'nodejs';

const Patch = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    query: SearchQuerySchema.optional(),
    enabled: z.boolean().optional(),
    intervalMinutes: z.number().int().min(60).max(10080).optional(),
  })
  .strict();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authorized(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = Patch.safeParse(await request.json().catch(() => null));

  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid update' }, { status: 400 });

  const old = await prisma.savedSearch.findUnique({ where: { id } });

  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const enabled = parsed.data.enabled ?? old.enabled;
  const intervalMinutes = parsed.data.intervalMinutes ?? old.intervalMinutes;
  const changedSchedule =
    parsed.data.enabled !== undefined ||
    parsed.data.intervalMinutes !== undefined;
  const updated = await prisma.savedSearch.update({
    where: { id },
    data: {
      ...parsed.data,
      nextRunAt: changedSchedule
        ? enabled
          ? new Date(Date.now() + intervalMinutes * 60000)
          : null
        : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authorized(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const found = await prisma.savedSearch.findUnique({ where: { id } });

  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Preserve discovery history. A hard delete would require explicit archival semantics.
  await prisma.savedSearch.update({
    where: { id },
    data: { enabled: false, nextRunAt: null },
  });

  return NextResponse.json({ archived: true });
}
