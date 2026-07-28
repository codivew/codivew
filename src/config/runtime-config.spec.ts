import type { CliOptions } from '../cli/arguments.js';
import { hasConfiguredRuntimeConfig, resolveRuntimeConfig } from './runtime-config.js';

const options: Pick<CliOptions, 'ollamaUrl' | 'model'> = {};

describe('runtime config', () => {
  it('applies CLI, user and default precedence', () => {
    const runtime = resolveRuntimeConfig(
      { ...options, ollamaUrl: 'http://cli.test:11434' },
      { ollamaUrl: 'http://user.test:11434', model: 'user-model' },
    );
    expect(runtime).toMatchObject({
      ollamaUrl: 'http://cli.test:11434',
      model: 'user-model',
      timeoutMs: 600_000,
      maxDiffChars: 120_000,
    });
  });

  it('uses defaults after all configurable sources', () => {
    expect(resolveRuntimeConfig(options)).toMatchObject({
      ollamaUrl: 'http://localhost:11434',
      model: 'qwen3.6:35b-a3b-coding-mxfp8',
    });
  });

  it('recognizes a complete configuration assembled from different sources', () => {
    expect(
      hasConfiguredRuntimeConfig(
        { ...options, ollamaUrl: 'http://cli.test:11434' },
        { model: 'user-model' },
      ),
    ).toBe(true);
  });
});
