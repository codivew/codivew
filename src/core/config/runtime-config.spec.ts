import { hasConfiguredRuntimeConfig, resolveRuntimeConfig } from './runtime-config.js';

const options: { apiUrl?: string; model?: string } = {};

describe('runtime config', () => {
  it('applies CLI, user and default precedence', () => {
    const runtime = resolveRuntimeConfig(
      { ...options, apiUrl: 'http://cli.test/v1' },
      { apiUrl: 'http://user.test/v1', model: 'user-model' },
    );
    expect(runtime).toMatchObject({
      apiUrl: 'http://cli.test/v1',
      model: 'user-model',
      authentication: { type: 'none' },
      timeoutMs: 600_000,
      maxDiffChars: 120_000,
    });
  });

  it('uses defaults after all configurable sources', () => {
    expect(resolveRuntimeConfig(options)).toMatchObject({
      apiUrl: 'http://localhost:11434/v1',
      model: 'qwen3.6:35b-a3b-coding-mxfp8',
    });
  });

  it('recognizes a complete configuration assembled from different sources', () => {
    expect(
      hasConfiguredRuntimeConfig(
        { ...options, apiUrl: 'http://cli.test/v1' },
        { model: 'user-model' },
      ),
    ).toBe(true);
  });
});
