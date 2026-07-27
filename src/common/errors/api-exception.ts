import { HttpException, type HttpStatus } from '@nestjs/common';
import type { ApiErrorResponse, ErrorCode } from '../constants/error-codes';

export class ApiException extends HttpException {
  constructor(status: HttpStatus, code: ErrorCode, message: string, details?: unknown) {
    const response: ApiErrorResponse = {
      error: { code, message, ...(details === undefined ? {} : { details }) },
    };
    super(response, status);
  }
}
