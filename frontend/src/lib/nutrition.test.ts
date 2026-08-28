import { describe, expect, it } from 'vitest';
import { kcalBucketFor } from './nutrition';

describe('kcalBucketFor', () => {
  it('buckets below 500', () => {
    expect(kcalBucketFor(0)).toBe('<500');
    expect(kcalBucketFor(499)).toBe('<500');
  });

  it('buckets 500-1000 inclusive', () => {
    expect(kcalBucketFor(500)).toBe('500-1000');
    expect(kcalBucketFor(1000)).toBe('500-1000');
  });

  it('buckets above 1000', () => {
    expect(kcalBucketFor(1001)).toBe('>1000');
  });
});
