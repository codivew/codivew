import { ConfigService } from '@nestjs/config';
import { ApiException } from '../common/errors/api-exception';
import { OllamaService } from './ollama.service';

const config = new ConfigService({
  ollama: { baseUrl: 'http://ollama.test', model: 'qwen', timeoutMs: 20, readyTimeoutMs: 20 },
});
const prompts = { system: 'system', user: 'user' };

describe('OllamaService', () => {
  const originalFetch = global.fetch;
  const service = new OllamaService(config);

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('returns parsed structured content', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: { content: '{"verdict":"approve"}' } }),
    });
    await expect(service.generateReview(prompts)).resolves.toEqual({ verdict: 'approve' });
  });

  it.each([
    ['connection failure', jest.fn().mockRejectedValue(new Error('network'))],
    ['5xx', jest.fn().mockResolvedValue({ ok: false, status: 500 })],
    [
      'unreadable body',
      jest.fn().mockResolvedValue({ ok: true, json: () => Promise.reject(new Error()) }),
    ],
  ])('maps %s to an API exception', async (_name, fetchMock) => {
    global.fetch = fetchMock;
    await expect(service.generateReview(prompts)).rejects.toBeInstanceOf(ApiException);
  });

  it.each([{ message: { content: 'not-json' } }, { message: {} }])(
    'rejects invalid model content',
    async (body) => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) });
      await expect(service.generateReview(prompts)).rejects.toBeInstanceOf(ApiException);
    },
  );

  it('aborts a timed-out request', async () => {
    global.fetch = jest.fn(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    ) as typeof fetch;
    await expect(service.generateReview(prompts)).rejects.toBeInstanceOf(ApiException);
  });
});
