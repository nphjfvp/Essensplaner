import { describe, expect, it } from 'vitest';
import { scaleIngredients } from './scale';

const ingredients = [
  { name: 'Mehl', amount: 200, unit: 'g' },
  { name: 'Salz', amount: 1, unit: 'Prise' },
  { name: 'Vanilleschote', amount: 0, unit: '' },
];

describe('scaleIngredients', () => {
  it('doubles amounts when doubling servings', () => {
    const result = scaleIngredients(ingredients, 4, 8);
    expect(result.servings).toBe(8);
    expect(result.ingredients[0].amount).toBe(400);
    expect(result.ingredients[1].amount).toBe(2);
  });

  it('halves amounts when halving servings', () => {
    const result = scaleIngredients(ingredients, 4, 2);
    expect(result.ingredients[0].amount).toBe(100);
  });

  it('leaves zero-amount ("nach Geschmack") ingredients untouched', () => {
    const result = scaleIngredients(ingredients, 4, 8);
    expect(result.ingredients[2].amount).toBe(0);
  });

  it('rounds to two decimal places', () => {
    const result = scaleIngredients([{ name: 'Hefe', amount: 7, unit: 'g' }], 3, 5);
    // 7 * (5/3) = 11.666... -> 11.67
    expect(result.ingredients[0].amount).toBe(11.67);
  });

  it('keeps name and unit unchanged', () => {
    const result = scaleIngredients(ingredients, 4, 8);
    expect(result.ingredients[0].name).toBe('Mehl');
    expect(result.ingredients[0].unit).toBe('g');
  });
});
