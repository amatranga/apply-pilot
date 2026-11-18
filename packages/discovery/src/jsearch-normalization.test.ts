import { describe, expect, it } from 'vitest';
import { annualUsdSalary, normalizeEmploymentType } from './jsearch';

describe('JSearch normalization', () => {
  it('maps supported employment types', () => {
    expect(normalizeEmploymentType(['FULLTIME'])).toBe('FULL_TIME');
    expect(normalizeEmploymentType(['CONTRACTOR'])).toBe('CONTRACT');
    expect(normalizeEmploymentType(['PARTTIME'])).toBe('PART_TIME');
    expect(normalizeEmploymentType([])).toBe('UNKNOWN');
  });
  it('accepts only annual USD salary values', () => {
    expect(annualUsdSalary(175000, 'USD', 'YEAR')).toBe(175000);
    expect(annualUsdSalary(80, 'USD', 'HOUR')).toBeNull();
    expect(annualUsdSalary(175000, 'EUR', 'YEAR')).toBeNull();
    expect(annualUsdSalary(null, 'USD', 'YEAR')).toBeNull();
  });
});
