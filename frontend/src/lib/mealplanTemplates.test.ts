import { describe, expect, it } from 'vitest';
import { computeTemplateApply } from './mealplanTemplates';

describe('computeTemplateApply', () => {
  it('sets days that differ from the current plan', () => {
    const { toSet, toDelete } = computeTemplateApply({}, { 0: 'r1', 2: 'r2' }, new Set(['r1', 'r2']));
    expect(toSet).toEqual([
      [0, 'r1'],
      [2, 'r2'],
    ]);
    expect(toDelete).toEqual([]);
  });

  it('skips days that already match', () => {
    const { toSet } = computeTemplateApply({ 0: 'r1' }, { 0: 'r1' }, new Set(['r1']));
    expect(toSet).toEqual([]);
  });

  it('deletes days present in the current plan but not in the template', () => {
    const { toDelete } = computeTemplateApply({ 3: 'r1' }, {}, new Set(['r1']));
    expect(toDelete).toEqual([3]);
  });

  it('skips template entries pointing at a deleted recipe instead of setting a dangling reference', () => {
    const { toSet, toDelete } = computeTemplateApply({}, { 1: 'gone' }, new Set(['r1']));
    expect(toSet).toEqual([]);
    expect(toDelete).toEqual([]);
  });

  it('clears a day whose current recipe was replaced by an invalid template entry', () => {
    const { toSet, toDelete } = computeTemplateApply({ 1: 'r1' }, { 1: 'gone' }, new Set(['r1']));
    expect(toSet).toEqual([]);
    expect(toDelete).toEqual([1]);
  });
});
