import { describe, expect, it } from 'vitest';
import { EMPTY_GOALS, hasGoals } from './goals';

describe('hasGoals', () => {
  it('is false when all values are zero', () => {
    expect(hasGoals(EMPTY_GOALS)).toBe(false);
  });

  it('is true when at least one value is set', () => {
    expect(hasGoals({ ...EMPTY_GOALS, kcal: 2000 })).toBe(true);
    expect(hasGoals({ ...EMPTY_GOALS, protein_g: 80 })).toBe(true);
  });
});
