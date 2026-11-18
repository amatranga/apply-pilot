import { describe, expect, it } from 'vitest';
import {
  filterJob,
  type FilterableJob,
  type FilterPreferences,
} from './filtering';

const preferences: FilterPreferences = {
  excludedCompanies: ['Inspira Financial'],
  workplaceTypes: ['REMOTE'],
  employmentTypes: ['FULL_TIME'],
  minimumBaseSalary: 150_000,
};
const job: FilterableJob = { company: 'Example', workplaceType: 'REMOTE' };

describe('filterJob', () => {
  it('allows an eligible job while reporting unknown employment and salary', () => {
    expect(filterJob(job, preferences)).toEqual({
      eligible: true,
      reasons: [],
      unknowns: [
        {
          code: 'EMPLOYMENT_UNKNOWN',
          message: 'Employment type is not available.',
        },
        {
          code: 'SALARY_UNKNOWN',
          message: 'Comparable annual USD base salary is not available.',
        },
      ],
    });
  });

  it('rejects an excluded company ignoring case and extra spaces', () => {
    const result = filterJob(
      { ...job, company: '  INSPIRA   financial ' },
      preferences
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons.map((reason) => reason.code)).toContain(
      'EXCLUDED_COMPANY'
    );
  });

  it('collects every confirmed mismatch', () => {
    const result = filterJob(
      {
        company: 'Inspira Financial',
        workplaceType: 'ONSITE',
        employmentType: 'CONTRACT',
        salaryMaxUsd: 120_000,
      },
      preferences
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons.map((reason) => reason.code)).toEqual([
      'EXCLUDED_COMPANY',
      'WORKPLACE_MISMATCH',
      'EMPLOYMENT_MISMATCH',
      'SALARY_BELOW_MINIMUM',
    ]);
    expect(result.unknowns).toEqual([]);
  });

  it('does not exclude unknown workplace type', () => {
    const result = filterJob({ ...job, workplaceType: 'UNKNOWN' }, preferences);
    expect(result.eligible).toBe(true);
    expect(result.unknowns.map((item) => item.code)).toContain(
      'WORKPLACE_UNKNOWN'
    );
  });

  it('accepts a salary maximum equal to the minimum', () => {
    const result = filterJob(
      { ...job, employmentType: 'FULL_TIME', salaryMaxUsd: 150_000 },
      preferences
    );
    expect(result).toEqual({ eligible: true, reasons: [], unknowns: [] });
  });

  it('does not require salary when no minimum is configured', () => {
    const result = filterJob(job, { ...preferences, minimumBaseSalary: null });
    expect(result.unknowns.map((item) => item.code)).not.toContain(
      'SALARY_UNKNOWN'
    );
  });
});
