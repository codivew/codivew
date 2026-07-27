export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  EMPTY_DIFF: 'EMPTY_DIFF',
  DIFF_TOO_LARGE: 'DIFF_TOO_LARGE',
  OLLAMA_UNAVAILABLE: 'OLLAMA_UNAVAILABLE',
  MODEL_RESPONSE_INVALID: 'MODEL_RESPONSE_INVALID',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export type ApiErrorResponse = {
  error: { code: ErrorCode; message: string; details?: unknown };
};
