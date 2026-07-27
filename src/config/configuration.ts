import type { Environment } from './env.schema';
import { validateEnvironment } from './env.schema';

export type AppConfiguration = ReturnType<typeof configuration>;

export default function configuration(): {
  app: {
    nodeEnv: string;
    port: number;
    apiToken: string;
    publicUrl: string;
    bodyLimitBytes: number;
  };
  ollama: { baseUrl: string; model: string; timeoutMs: number; readyTimeoutMs: number };
  review: { maxDiffChars: number; resultTtlMs: number };
} {
  const env: Environment = validateEnvironment(process.env);
  return {
    app: {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      apiToken: env.REVIEW_API_TOKEN,
      publicUrl: env.PUBLIC_URL.replace(/\/$/, ''),
      bodyLimitBytes: env.REVIEW_BODY_LIMIT_BYTES,
    },
    ollama: {
      baseUrl: env.OLLAMA_BASE_URL.replace(/\/$/, ''),
      model: env.OLLAMA_MODEL,
      timeoutMs: env.OLLAMA_TIMEOUT_MS,
      readyTimeoutMs: 5_000,
    },
    review: {
      maxDiffChars: env.REVIEW_MAX_DIFF_CHARS,
      resultTtlMs: env.REVIEW_RESULT_TTL_MS,
    },
  };
}
