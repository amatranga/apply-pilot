import { z } from 'zod';

export const CandidateProfileInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    headline: z.string().trim().max(200).nullable(),
    location: z.string().trim().max(120).nullable(),
    yearsOfExperience: z.number().int().min(0).max(70).nullable(),
    skills: z
      .object({
        primary: z.array(z.string().trim().min(1).max(60)).max(50),
        secondary: z.array(z.string().trim().min(1).max(60)).max(50),
      })
      .strict(),
    preferences: z
      .object({
        targetTitles: z.array(z.string().trim().min(1).max(120)).max(30),
        workplaceTypes: z.array(z.enum(['REMOTE', 'HYBRID', 'ONSITE'])).min(1),
        employmentTypes: z
          .array(z.enum(['FULL_TIME', 'CONTRACT', 'PART_TIME']))
          .min(1),
        minimumBaseSalary: z
          .number()
          .int()
          .nonnegative()
          .max(10000000)
          .nullable(),
        preferredIndustries: z.array(z.string().trim().min(1).max(100)).max(30),
        excludedCompanies: z.array(z.string().trim().min(1).max(120)).max(100),
      })
      .strict(),
  })
  .strict();

export type CandidateProfileInput = z.infer<typeof CandidateProfileInputSchema>;
