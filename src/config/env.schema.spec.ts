import { validateEnvironment } from './env.schema';

describe('environment schema', () => {
  it('uses one day as the default review result TTL', () => {
    expect(validateEnvironment({ NODE_ENV: 'test' }).REVIEW_RESULT_TTL_MS).toBe(86_400_000);
  });

  it('accepts a custom positive review result TTL', () => {
    expect(
      validateEnvironment({ NODE_ENV: 'test', REVIEW_RESULT_TTL_MS: '3600000' })
        .REVIEW_RESULT_TTL_MS,
    ).toBe(3_600_000);
  });

  it('rejects a non-positive review result TTL', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'test', REVIEW_RESULT_TTL_MS: '0' })).toThrow();
  });
});
