import { describe, expect, it } from 'vitest';
import { isRetryable } from '@/lib/client/queries';

describe('retry rule', () => {
  it('retries network failures and the rate provider failing upstream', () => {
    expect(isRetryable(new TypeError('Failed to fetch'))).toBe(true);
    for (const status of [502, 503, 504]) expect(isRetryable({ status })).toBe(true);
  });

  it('does not retry bad requests or faults in the app’s own calculation', () => {
    for (const status of [400, 404, 422, 500]) expect(isRetryable({ status })).toBe(false);
  });
});
