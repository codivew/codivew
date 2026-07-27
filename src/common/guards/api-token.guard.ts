import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';
import { ERROR_CODES } from '../constants/error-codes';
import { ApiException } from '../errors/api-exception';
import { safeTokenEqual } from '../utils/timing-safe-equal';

@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const authorization = request.headers.authorization;
    const expectedToken = this.config.get<string>('app.apiToken', '');

    if (
      typeof authorization !== 'string' ||
      !authorization.startsWith('Bearer ') ||
      authorization.slice(7).length === 0 ||
      !safeTokenEqual(authorization.slice(7), expectedToken)
    ) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        '인증에 실패했습니다.',
      );
    }
    return true;
  }
}
