import { describe, expect, it } from 'vitest';
import { parseSharedPayload } from './share';

describe('parseSharedPayload', () => {
  it('returns nothing for an empty payload', () => {
    expect(parseSharedPayload({})).toEqual({});
  });

  it('extracts a clean url param', () => {
    expect(parseSharedPayload({ url: 'https://example.com/rezept' })).toEqual({
      url: 'https://example.com/rezept',
    });
  });

  it('extracts a URL embedded in shared text (Instagram/TikTok style)', () => {
    const result = parseSharedPayload({
      text: 'Schau dir dieses Rezept an! https://www.instagram.com/reel/abc123/ Total lecker',
    });
    expect(result.url).toBe('https://www.instagram.com/reel/abc123/');
    expect(result.text).toBe('Schau dir dieses Rezept an!  Total lecker');
  });

  it('strips trailing punctuation from the extracted URL', () => {
    const result = parseSharedPayload({ text: 'Check this out: https://example.com/foo.' });
    expect(result.url).toBe('https://example.com/foo');
  });

  it('falls back to text-only when no URL is present', () => {
    expect(parseSharedPayload({ text: 'Nur ein Rezepttext ohne Link' })).toEqual({
      text: 'Nur ein Rezepttext ohne Link',
    });
  });

  it('combines title, text and url params', () => {
    const result = parseSharedPayload({ title: 'Bestes Rezept', url: 'https://example.com/x' });
    expect(result.url).toBe('https://example.com/x');
    expect(result.text).toBe('Bestes Rezept');
  });
});
