import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ApiException } from '../errors/api-exception';

@Catch(ApiException)
export class ApiExceptionFilter implements ExceptionFilter<ApiException> {
  catch(exception: ApiException, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    void reply.status(exception.getStatus()).send(exception.getResponse());
  }
}
