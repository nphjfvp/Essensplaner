import { describe, expect, it } from 'vitest';
import { codeToEmail, formatCode, generateCode, normalizeCode } from './code';

describe('generateCode', () => {
  it('generates a 20-character code from the safe alphabet', () => {
    const code = generateCode();
    expect(code).toHaveLength(20);
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{20}$/);
  });

  it('does not contain ambiguous characters (I/O/0/1)', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateCode()).not.toMatch(/[IO01]/);
    }
  });
});

describe('normalizeCode', () => {
  it('removes spaces and dashes and uppercases', () => {
    expect(normalizeCode('abcd-efgh 1234')).toBe('ABCDEFGH1234');
  });
});

describe('formatCode', () => {
  it('groups into blocks of 4 separated by dashes', () => {
    expect(formatCode('abcdefgh12345678')).toBe('ABCD-EFGH-1234-5678');
  });

  it('does not leave a trailing dash for non-multiple-of-4 lengths', () => {
    expect(formatCode('abcdefghi')).toBe('ABCD-EFGH-I');
  });
});

describe('codeToEmail', () => {
  it('builds a lowercase synthetic email from the code', () => {
    expect(codeToEmail('ABCD1234')).toBe('u_abcd1234@essensplaner.app');
  });
});
