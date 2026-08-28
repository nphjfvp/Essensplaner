import { describe, expect, it } from 'vitest';
import { categorize } from './shoppingCategories';

describe('categorize', () => {
  it.each([
    ['Apfel', 'Obst & Gemüse'],
    ['Zwiebeln', 'Obst & Gemüse'],
    ['Vollkornbrot', 'Brot & Backwaren'],
    ['Basmatireis', 'Trockenware & Konserven'],
    ['Milch', 'Kühlregal'],
    ['Hähnchenbrust', 'Fleisch & Fisch'],
    ['TK-Erbsen', 'Tiefkühl'],
    ['Olivenöl', 'Gewürze & Öle'],
    ['Orangensaft', 'Getränke'],
  ])('categorizes "%s" as "%s"', (name, expected) => {
    expect(categorize(name)).toBe(expected);
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(categorize('  APFEL  ')).toBe('Obst & Gemüse');
  });

  it('falls back to "Sonstiges" for unknown items', () => {
    expect(categorize('Klopapier')).toBe('Sonstiges');
  });

  it('prefers the more specific "Kokosmilch" (Trockenware) over the generic "Milch" (Kühlregal)', () => {
    expect(categorize('Kokosmilch')).toBe('Trockenware & Konserven');
  });
});
