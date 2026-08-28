import { describe, expect, it } from 'vitest';
import { computeTemplateApply, type DayPlan } from './mealplanTemplates';

const day = (recipeId: string, portions = 1): DayPlan => ({ recipeId, portions });

describe('computeTemplateApply', () => {
  it('sets days that differ from the current plan', () => {
    const { toSet, toDelete } = computeTemplateApply({}, { 0: day('r1'), 2: day('r2') }, new Set(['r1', 'r2']));
    expect(toSet).toEqual([
      [0, day('r1')],
      [2, day('r2')],
    ]);
    expect(toDelete).toEqual([]);
  });

  it('skips days that already match (recipe and portions)', () => {
    const { toSet } = computeTemplateApply({ 0: day('r1', 2) }, { 0: day('r1', 2) }, new Set(['r1']));
    expect(toSet).toEqual([]);
  });

  it('sets a day whose portions differ even if the recipe is the same', () => {
    const { toSet } = computeTemplateApply({ 0: day('r1', 1) }, { 0: day('r1', 3) }, new Set(['r1']));
    expect(toSet).toEqual([[0, day('r1', 3)]]);
  });

  it('deletes days present in the current plan but not in the template', () => {
    const { toDelete } = computeTemplateApply({ 3: day('r1') }, {}, new Set(['r1']));
    expect(toDelete).toEqual([3]);
  });

  it('skips template entries pointing at a deleted recipe instead of setting a dangling reference', () => {
    const { toSet, toDelete } = computeTemplateApply({}, { 1: day('gone') }, new Set(['r1']));
    expect(toSet).toEqual([]);
    expect(toDelete).toEqual([]);
  });

  it('clears a day whose current recipe was replaced by an invalid template entry', () => {
    const { toSet, toDelete } = computeTemplateApply({ 1: day('r1') }, { 1: day('gone') }, new Set(['r1']));
    expect(toSet).toEqual([]);
    expect(toDelete).toEqual([1]);
  });
});
