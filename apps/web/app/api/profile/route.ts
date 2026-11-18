import { NextResponse } from "next/server";
import { prisma } from "@applypilot/database";
import { ZodError } from "zod/v4";
import { authorized } from "../_lib/auth";
import { CandidateProfileInputSchema } from "../_lib/candidate-profile";

export const runtime = "nodejs";
const PROFILE_ID = "primary";

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const profile = await prisma.candidateProfile.findUnique({
    where: { id: PROFILE_ID },
  });

  if (!profile) {
    return NextResponse.json({ profile: null });
  }

  const {
    id,
    userId,
    createdAt,
    updatedAt,
    ...profileInput
  } = profile;

  return NextResponse.json({
    profile: CandidateProfileInputSchema.parse(profileInput),
  });
}

export async function PUT(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed JSON request body" },
      { status: 400 }
    );
  }

  const result = CandidateProfileInputSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid candidate profile",
        issues: result.error.flatten(),
      },
      { status: 400 }
    );
  }

  const input = result.data;
  const profile = await prisma.candidateProfile.upsert({
    where: { id: PROFILE_ID },
    create: { id: PROFILE_ID, ...input },
    update: input,
  });
  return NextResponse.json({ profile });
}
