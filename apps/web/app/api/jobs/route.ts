import { NextResponse } from 'next/server';
import { prisma } from '@applypilot/database';
import { authorized } from '../_lib/auth';
import { CandidateProfileInputSchema } from '../_lib/candidate-profile';
import { filterJob } from '@applypilot/discovery';

export async function GET(request: Request) {
  if (!authorized(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const hours = Number(url.searchParams.get('hours') ?? 168);

  if (!Number.isInteger(hours) || hours < 1 || hours > 720)
    return NextResponse.json({ error: 'Invalid hours' }, { status: 400 });

  const jobs = await prisma.jobPosting.findMany({
    where: {
      postedAt: { gte: new Date(Date.now() - hours * 3_600_000) },
    },
    orderBy: { postedAt: 'desc' },
    take: 100,
  });

  const savedProfile = await prisma.candidateProfile.findUnique({
    where: { id: 'primary' },
    select: {
      name: true,
      headline: true,
      location: true,
      yearsOfExperience: true,
      skills: true,
      preferences: true,
    },
  });
  const profile = savedProfile
    ? CandidateProfileInputSchema.safeParse(savedProfile)
    : null;
  if (profile && !profile.success) {
    return NextResponse.json(
      {
        error: 'Saved candidate profile is invalid',
        issues: profile.error.flatten(),
      },
      { status: 500 }
    );
  }
  const preferences = profile?.success ? profile.data.preferences : null;
  return NextResponse.json({
    profileConfigured: preferences !== null,
    jobs: jobs.map((job) => ({
      ...job,
      evaluation: preferences ? filterJob(job, preferences) : null,
    })),
  });
}
