import { describe, expect, it } from 'vitest';
import { parseJson } from './openrouter';

describe('parseJson', () => {
  it('parses plain JSON', () => {
    expect(parseJson<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
  });

  it('strips markdown code fences', () => {
    expect(parseJson<{ a: number }>('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it('extracts JSON surrounded by prose', () => {
    expect(parseJson<{ a: number }>('Hier ist das Ergebnis:\n{"a": 1}\nHoffe das hilft.')).toEqual({ a: 1 });
  });

  it('throws when no braces are present', () => {
    expect(() => parseJson('kein JSON hier')).toThrow('Kein JSON im Modell-Output gefunden');
  });

  it('throws on malformed JSON between the braces', () => {
    expect(() => parseJson('{"a": }')).toThrow(/ungültig|kein gültiges JSON/i);
  });
});
