import { validateEnvironment } from './env.schema.js';

describe('environment schema', () => {
  it('leaves Ollama selection unset and uses default review limits', () => {
    const env = validateEnvironment({});
    expect(env.OLLAMA_BASE_URL).toBeUndefined();
    expect(env.OLLAMA_MODEL).toBeUndefined();
    expect(env.OLLAMA_TIMEOUT_MS).toBe(600_000);
    expect(env.REVIEW_MAX_DIFF_CHARS).toBe(120_000);
  });

  it('accepts custom Ollama configuration', () => {
    const env = validateEnvironment({
      OLLAMA_BASE_URL: 'http://ollama.test:11434',
      OLLAMA_MODEL: 'qwen',
      OLLAMA_TIMEOUT_MS: '30000',
      REVIEW_MAX_DIFF_CHARS: '50000',
    });
    expect(env).toMatchObject({
      OLLAMA_BASE_URL: 'http://ollama.test:11434',
      OLLAMA_MODEL: 'qwen',
      OLLAMA_TIMEOUT_MS: 30_000,
      REVIEW_MAX_DIFF_CHARS: 50_000,
    });
  });

  it('rejects a non-positive timeout', () => {
    expect(() => validateEnvironment({ OLLAMA_TIMEOUT_MS: '0' })).toThrow();
  });
});
