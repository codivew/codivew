import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ApiException } from '../errors/api-exception';

@Catch(ApiException)
export class ApiExceptionFilter implements ExceptionFilter<ApiException> {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: ApiException, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<FastifyRequest>();
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const response = exception.getResponse();
    const code =
      typeof response === 'object' &&
      response !== null &&
      'error' in response &&
      typeof response.error === 'object' &&
      response.error !== null &&
      'code' in response.error
        ? response.error.code
        : 'UNKNOWN';
    this.logger.warn({
      requestId: request.id,
      statusCode: exception.getStatus(),
      code,
    });
    void reply.status(exception.getStatus()).send(exception.getResponse());
  }
}
