import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ERROR_CODES, type ApiErrorResponse } from '../constants/error-codes';

type ErrorWithCode = Error & { code?: string; statusCode?: number };

@Catch()
export class UnhandledExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(UnhandledExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const error = exception as ErrorWithCode;

    if (
      error?.code === 'FST_ERR_CTP_BODY_TOO_LARGE' ||
      error?.statusCode === 413 ||
      (exception instanceof HttpException && exception.getStatus() === 413)
    ) {
      void reply.status(HttpStatus.PAYLOAD_TOO_LARGE).send({
        error: {
          code: ERROR_CODES.DIFF_TOO_LARGE,
          message: 'Diff가 리뷰 가능한 최대 크기를 초과했습니다.',
        },
      } satisfies ApiErrorResponse);
      return;
    }

    if (exception instanceof BadRequestException) {
      const response = exception.getResponse();
      const details =
        typeof response === 'object' && response !== null && 'message' in response
          ? response.message
          : undefined;
      void reply.status(HttpStatus.BAD_REQUEST).send({
        error: {
          code: ERROR_CODES.INVALID_REQUEST,
          message: '요청 데이터가 올바르지 않습니다.',
          details,
        },
      } satisfies ApiErrorResponse);
      return;
    }

    if (exception instanceof HttpException) {
      void reply.status(exception.getStatus()).send(exception.getResponse());
      return;
    }

    this.logger.error('Unhandled exception');
    void reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '서버 내부 오류가 발생했습니다.',
      },
    } satisfies ApiErrorResponse);
  }
}
