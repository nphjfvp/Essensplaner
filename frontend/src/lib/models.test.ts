import { describe, expect, it } from 'vitest';
import { DEFAULT_MODELS, sanitizeSettings } from './models';

describe('sanitizeSettings', () => {
  it('returns defaults when no settings are given', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_MODELS);
  });

  it('keeps valid model ids', () => {
    const result = sanitizeSettings({ extract: 'openai/gpt-4o' });
    expect(result.extract).toBe('openai/gpt-4o');
  });

  it('falls back to the default for a dead/unknown model slug', () => {
    const result = sanitizeSettings({ extract: 'some/removed-model-slug' });
    expect(result.extract).toBe(DEFAULT_MODELS.extract);
  });

  it('fills in defaults for keys missing from stored settings', () => {
    const result = sanitizeSettings({ review: 'openai/gpt-4o' });
    expect(result.review).toBe('openai/gpt-4o');
    expect(result.extract).toBe(DEFAULT_MODELS.extract);
    expect(result.vision).toBe(DEFAULT_MODELS.vision);
  });
});
