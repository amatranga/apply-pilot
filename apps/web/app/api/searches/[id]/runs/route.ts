import { NextResponse } from 'next/server';
import { prisma } from '@applypilot/database';
import { authorized } from '../../../_lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authorized(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  return NextResponse.json({
    runs: await prisma.discoveryRun.findMany({
      where: { savedSearchId: id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  });
}
