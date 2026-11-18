-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'CONTRACT', 'PART_TIME', 'UNKNOWN');

-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN     "employmentType" "EmploymentType" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "salaryMaxUsd" INTEGER,
ADD COLUMN     "salaryMinUsd" INTEGER;
