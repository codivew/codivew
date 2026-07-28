import { z } from 'zod';
import type { CliOptions } from '../cli/arguments.js';
import type { UserConfig } from './user-config.js';

export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
export const DEFAULT_OLLAMA_MODEL = 'qwen3.6:35b-a3b-coding-mxfp8';
const DEFAULT_OLLAMA_TIMEOUT_MS = 600_000;
const DEFAULT_MAX_DIFF_CHARS = 120_000;

export type RuntimeConfig = {
  ollamaUrl: string;
  model: string;
  timeoutMs: number;
  maxDiffChars: number;
};

const runtimeConfigSchema = z.object({
  ollamaUrl: z.string().url(),
  model: z.string().trim().min(1),
  timeoutMs: z.number().int().positive(),
  maxDiffChars: z.number().int().positive(),
});

export function resolveRuntimeConfig(
  options: Pick<CliOptions, 'ollamaUrl' | 'model'>,
  userConfig?: UserConfig,
): RuntimeConfig {
  return runtimeConfigSchema.parse({
    ollamaUrl: options.ollamaUrl ?? userConfig?.ollamaUrl ?? DEFAULT_OLLAMA_URL,
    model: options.model ?? userConfig?.model ?? DEFAULT_OLLAMA_MODEL,
    timeoutMs: DEFAULT_OLLAMA_TIMEOUT_MS,
    maxDiffChars: DEFAULT_MAX_DIFF_CHARS,
  });
}

export function hasConfiguredRuntimeConfig(
  options: Pick<CliOptions, 'ollamaUrl' | 'model'>,
  userConfig?: UserConfig,
): boolean {
  return (
    (options.ollamaUrl ?? userConfig?.ollamaUrl) !== undefined &&
    (options.model ?? userConfig?.model) !== undefined
  );
}
