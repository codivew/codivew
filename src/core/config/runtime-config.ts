import { z } from 'zod';

export const DEFAULT_API_URL = 'http://localhost:11434/v1';
export const DEFAULT_MODEL = 'qwen3.6:35b-a3b-coding-mxfp8';
export const DEFAULT_API_TIMEOUT_MS = 600_000;
export const DEFAULT_MAX_DIFF_CHARS = 120_000;

export type Authentication =
  | { type: 'none' }
  | { type: 'api-key'; apiKey: string }
  | { type: 'basic'; username: string; password: string };

export type RuntimeConfig = {
  apiUrl: string;
  model: string;
  authentication: Authentication;
  timeoutMs: number;
  maxDiffChars: number;
};

export type RuntimeConfigValues = {
  apiUrl?: string;
  model?: string;
  authentication?: Authentication;
};

const runtimeConfigSchema = z.object({
  apiUrl: z.string().url(),
  model: z.string().trim().min(1),
  authentication: z.discriminatedUnion('type', [
    z.object({ type: z.literal('none') }),
    z.object({ type: z.literal('api-key'), apiKey: z.string().min(1) }),
    z.object({
      type: z.literal('basic'),
      username: z.string().min(1),
      password: z.string().min(1),
    }),
  ]),
  timeoutMs: z.number().int().positive(),
  maxDiffChars: z.number().int().positive(),
});

export function resolveRuntimeConfig(
  options: RuntimeConfigValues,
  userConfig?: RuntimeConfigValues,
): RuntimeConfig {
  return runtimeConfigSchema.parse({
    apiUrl: options.apiUrl ?? userConfig?.apiUrl ?? DEFAULT_API_URL,
    model: options.model ?? userConfig?.model ?? DEFAULT_MODEL,
    authentication: options.authentication ?? userConfig?.authentication ?? { type: 'none' },
    timeoutMs: DEFAULT_API_TIMEOUT_MS,
    maxDiffChars: DEFAULT_MAX_DIFF_CHARS,
  });
}

export function hasConfiguredRuntimeConfig(
  options: RuntimeConfigValues,
  userConfig?: RuntimeConfigValues,
): boolean {
  return (
    (options.apiUrl ?? userConfig?.apiUrl) !== undefined &&
    (options.model ?? userConfig?.model) !== undefined
  );
}
