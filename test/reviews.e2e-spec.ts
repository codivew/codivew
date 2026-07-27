import { HttpStatus, RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { ERROR_CODES } from '../src/common/constants/error-codes';
import { ApiException } from '../src/common/errors/api-exception';
import { ApiExceptionFilter } from '../src/common/filters/api-exception.filter';
import { UnhandledExceptionFilter } from '../src/common/filters/unhandled-exception.filter';
import { OllamaService } from '../src/reviews/ollama.service';
import { configureSwagger } from '../src/swagger';

const diff = `diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1 +1 @@
-old
+new`;
const valid = { verdict: 'approve', risk: 'low', summary: '좋습니다.', issues: [], tests: [] };

function errorCode(response: { json(): unknown }): string {
  return (response.json() as { error: { code: string } }).error.code;
}

describe('Review API (e2e)', () => {
  let app: NestFastifyApplication;
  const ollama = {
    model: 'test-model',
    generateReview: jest.fn(),
    isReady: jest.fn(),
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.REVIEW_API_TOKEN = 'test-token';
    process.env.PUBLIC_URL = 'https://reviews.test/result';
    process.env.REVIEW_MAX_DIFF_CHARS = '120';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(OllamaService)
      .useValue(ollama)
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ bodyLimit: 2048 }),
    );
    app.setGlobalPrefix('api', {
      exclude: [{ path: 'result/:reviewId', method: RequestMethod.GET }],
    });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new UnhandledExceptionFilter(), new ApiExceptionFilter());
    configureSwagger(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => app.close());
  beforeEach(() => {
    jest.clearAllMocks();
    ollama.generateReview.mockResolvedValue(valid);
    ollama.isReady.mockResolvedValue(true);
  });

  it('returns only the public URL and serves the generated HTML there', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: { authorization: 'Bearer test-token', accept: 'text/plain' },
      payload: { repository: 'repo', mode: 'staged', diff },
    });
    expect(response.statusCode).toBe(201);
    expect(response.headers['content-type']).toContain('text/plain');
    const reviewId = response.headers['x-review-id'];
    expect(reviewId).toMatch(/^[A-Za-z0-9_-]{12}$/);
    if (typeof reviewId !== 'string') throw new Error('X-Review-Id header is missing');
    expect(response.payload).toBe(`https://reviews.test/result/${reviewId}`);
    expect(response.headers.location).toBe(response.payload);
    expect(response.headers['cache-control']).toBe('no-store');

    const report = await app.inject({
      method: 'GET',
      url: `/result/${reviewId}`,
    });
    expect(report.statusCode).toBe(200);
    expect(report.headers['content-type']).toContain('text/html');
    expect(report.headers['content-security-policy']).toContain("default-src 'none'");
    expect(report.payload).toContain('AI Code Review');
  });

  it('rejects missing authorization', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      payload: { repository: 'repo', mode: 'staged', diff },
    });
    expect(response.statusCode).toBe(401);
    expect(errorCode(response)).toBe('UNAUTHORIZED');
  });

  it('returns the common DTO validation error', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: { authorization: 'Bearer test-token' },
      payload: { repository: '', mode: 'bad', diff },
    });
    expect(response.statusCode).toBe(400);
    expect(errorCode(response)).toBe('INVALID_REQUEST');
  });

  it('rejects an empty or fully excluded diff', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: { authorization: 'Bearer test-token' },
      payload: { repository: 'repo', mode: 'staged', diff: diff.replaceAll('src/app.ts', '.env') },
    });
    expect(response.statusCode).toBe(400);
    expect(errorCode(response)).toBe('EMPTY_DIFF');
  });

  it('rejects a filtered diff over the configured limit', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: { authorization: 'Bearer test-token' },
      payload: { repository: 'repo', mode: 'staged', diff: `${diff}\n+${'x'.repeat(100)}` },
    });
    expect(response.statusCode).toBe(413);
    expect(errorCode(response)).toBe('DIFF_TOO_LARGE');
  });

  it('maps Fastify body limit errors to the common response', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
      payload: JSON.stringify({
        repository: 'repo',
        mode: 'staged',
        diff: `${diff}\n${'x'.repeat(2_500)}`,
      }),
    });
    expect(response.statusCode).toBe(413);
    expect(errorCode(response)).toBe('DIFF_TOO_LARGE');
  });

  it('propagates Ollama and invalid model errors safely', async () => {
    ollama.generateReview.mockRejectedValueOnce(
      new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        ERROR_CODES.OLLAMA_UNAVAILABLE,
        'AI 리뷰 서비스에 연결할 수 없습니다.',
      ),
    );
    const unavailable = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: { authorization: 'Bearer test-token' },
      payload: { repository: 'repo', mode: 'staged', diff },
    });
    expect(unavailable.statusCode).toBe(503);
    expect(errorCode(unavailable)).toBe('OLLAMA_UNAVAILABLE');

    ollama.generateReview.mockResolvedValue({ invalid: true });
    const invalid = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: { authorization: 'Bearer test-token' },
      payload: { repository: 'repo', mode: 'staged', diff },
    });
    expect(invalid.statusCode).toBe(502);
    expect(errorCode(invalid)).toBe('MODEL_RESPONSE_INVALID');
  });

  it('serves health and readiness without authentication', async () => {
    const health = await app.inject({ method: 'GET', url: '/api/health' });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({ status: 'ok' });
    const ready = await app.inject({ method: 'GET', url: '/api/ready' });
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toEqual({ status: 'ready', ollama: 'connected' });

    ollama.isReady.mockResolvedValue(false);
    const notReady = await app.inject({ method: 'GET', url: '/api/ready' });
    expect(notReady.statusCode).toBe(503);
  });

  it('serves Swagger UI and an OpenAPI document', async () => {
    const docs = await app.inject({ method: 'GET', url: '/api/docs' });
    expect(docs.statusCode).toBe(200);
    expect(docs.headers['content-type']).toContain('text/html');

    const schema = await app.inject({ method: 'GET', url: '/api/docs-json' });
    expect(schema.statusCode).toBe(200);
    const document = schema.json<{ paths: Record<string, unknown> }>();
    expect(document.paths).toHaveProperty('/api/reviews');
    expect(document.paths).toHaveProperty('/api/health');
  });
});
