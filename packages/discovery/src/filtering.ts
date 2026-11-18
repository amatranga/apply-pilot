/** Pure, conservative eligibility filtering. No database or provider dependencies. */
export type WorkplaceType = 'REMOTE' | 'HYBRID' | 'ONSITE' | 'UNKNOWN';
export type EmploymentType = 'FULL_TIME' | 'CONTRACT' | 'PART_TIME' | 'UNKNOWN';

export type FilterableJob = {
  company: string;
  workplaceType: WorkplaceType;
  /** Not yet stored on JobPosting in v0.3. */
  employmentType?: EmploymentType | null;
  /** Annual base salary in USD, if reliably normalized. */
  salaryMaxUsd?: number | null;
};

/** Structural subset of CandidateProfileInput['preferences']. */
export type FilterPreferences = {
  excludedCompanies: string[];
  workplaceTypes: Array<Exclude<WorkplaceType, 'UNKNOWN'>>;
  employmentTypes: Array<Exclude<EmploymentType, 'UNKNOWN'>>;
  minimumBaseSalary: number | null;
};

export type FilterReasonCode =
  | 'EXCLUDED_COMPANY'
  | 'WORKPLACE_MISMATCH'
  | 'EMPLOYMENT_MISMATCH'
  | 'SALARY_BELOW_MINIMUM';

export type FilterUnknownCode =
  'WORKPLACE_UNKNOWN' | 'EMPLOYMENT_UNKNOWN' | 'SALARY_UNKNOWN';

export type FilterResult = {
  eligible: boolean;
  reasons: Array<{ code: FilterReasonCode; message: string }>;
  unknowns: Array<{ code: FilterUnknownCode; message: string }>;
};

/** Ignore case, leading/trailing whitespace, and repeated internal whitespace. */
function normalizeCompany(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

export function filterJob(
  job: FilterableJob,
  preferences: FilterPreferences
): FilterResult {
  const reasons: FilterResult['reasons'] = [];
  const unknowns: FilterResult['unknowns'] = [];

  const company = normalizeCompany(job.company);
  if (
    preferences.excludedCompanies.some(
      (excluded) => normalizeCompany(excluded) === company
    )
  ) {
    reasons.push({
      code: 'EXCLUDED_COMPANY',
      message: `${job.company} is on the excluded-companies list.`,
    });
  }

  if (job.workplaceType === 'UNKNOWN') {
    unknowns.push({
      code: 'WORKPLACE_UNKNOWN',
      message: 'Workplace type is not confirmed.',
    });
  } else if (!preferences.workplaceTypes.includes(job.workplaceType)) {
    reasons.push({
      code: 'WORKPLACE_MISMATCH',
      message: `${job.workplaceType} is not an allowed workplace type.`,
    });
  }

  if (job.employmentType == null || job.employmentType === 'UNKNOWN') {
    unknowns.push({
      code: 'EMPLOYMENT_UNKNOWN',
      message: 'Employment type is not available.',
    });
  } else if (!preferences.employmentTypes.includes(job.employmentType)) {
    reasons.push({
      code: 'EMPLOYMENT_MISMATCH',
      message: `${job.employmentType} is not an allowed employment type.`,
    });
  }

  if (preferences.minimumBaseSalary !== null) {
    if (
      job.salaryMaxUsd == null ||
      !Number.isFinite(job.salaryMaxUsd) ||
      job.salaryMaxUsd < 0
    ) {
      unknowns.push({
        code: 'SALARY_UNKNOWN',
        message: 'Comparable annual USD base salary is not available.',
      });
    } else if (job.salaryMaxUsd < preferences.minimumBaseSalary) {
      reasons.push({
        code: 'SALARY_BELOW_MINIMUM',
        message: `Maximum annual base salary ($${job.salaryMaxUsd.toLocaleString('en-US')}) is below the minimum ($${preferences.minimumBaseSalary.toLocaleString('en-US')}).`,
      });
    }
  }

  return { eligible: reasons.length === 0, reasons, unknowns };
}
