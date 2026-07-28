import type { ErrorCode } from '../constants/error-codes.js';

export class ReviewError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ReviewError';
  }
}
