import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiException } from '../errors/api-exception';
import { ApiTokenGuard } from './api-token.guard';

function context(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
      getResponse: jest.fn(),
      getNext: jest.fn(),
    }),
  } as unknown as ExecutionContext;
}

describe('ApiTokenGuard', () => {
  const guard = new ApiTokenGuard(new ConfigService({ app: { apiToken: 'secret' } }));

  it('accepts a valid bearer token', () => {
    expect(guard.canActivate(context('Bearer secret'))).toBe(true);
  });

  it.each([undefined, '', 'Basic secret', 'Bearer wrong', 'Bearer '])(
    'rejects invalid authorization %p',
    (authorization) => {
      expect(() => guard.canActivate(context(authorization))).toThrow(ApiException);
    },
  );
});
