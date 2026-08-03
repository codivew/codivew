import { jest } from '@jest/globals';
import { ReviewError } from '../common/errors/review-error.js';
import { OllamaService } from './ollama.service.js';

const prompts = { system: 'system', user: 'user' };

describe('OllamaService', () => {
  const originalFetch = global.fetch;
  const service = new OllamaService({
    baseUrl: 'http://ollama.test/',
    model: 'qwen',
    timeoutMs: 20,
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns parsed structured content', async () => {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: { content: '{"verdict":"approve"}' } }),
    } as Response);
    await expect(service.generateReview(prompts)).resolves.toEqual({ verdict: 'approve' });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://ollama.test/api/chat',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it.each([
    ['connection failure', jest.fn<typeof fetch>().mockRejectedValue(new Error('network'))],
    ['5xx', jest.fn<typeof fetch>().mockResolvedValue({ ok: false, status: 500 } as Response)],
  ])('maps %s to a review error', async (_name, fetchMock) => {
    global.fetch = fetchMock;
    await expect(service.generateReview(prompts)).rejects.toBeInstanceOf(ReviewError);
  });

  it.each([
    {
      ok: true,
      json: (): Promise<unknown> => Promise.resolve({ message: { content: 'not-json' } }),
    },
    { ok: true, json: (): Promise<unknown> => Promise.resolve({ message: {} }) },
    { ok: true, json: (): Promise<unknown> => Promise.reject(new Error('invalid body')) },
  ])('rejects invalid model content', async (response) => {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue(response as Response);
    await expect(service.generateReview(prompts)).rejects.toBeInstanceOf(ReviewError);
  });

  it('aborts a timed-out request', async () => {
    global.fetch = jest.fn<typeof fetch>().mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    await expect(service.generateReview(prompts)).rejects.toMatchObject({
      code: 'OLLAMA_UNAVAILABLE',
    });
  });

  it('maps caller cancellation separately from a timeout', async () => {
    const controller = new AbortController();
    const cancellableService = new OllamaService({
      baseUrl: 'http://ollama.test',
      model: 'qwen',
      timeoutMs: 1_000,
      signal: controller.signal,
    });
    global.fetch = jest.fn<typeof fetch>().mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    const review = cancellableService.generateReview(prompts);
    controller.abort();

    await expect(review).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  it('does not start a request when already cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    const cancelledService = new OllamaService({
      baseUrl: 'http://ollama.test',
      model: 'qwen',
      timeoutMs: 1_000,
      signal: controller.signal,
    });
    global.fetch = jest.fn<typeof fetch>();

    await expect(cancelledService.generateReview(prompts)).rejects.toMatchObject({
      code: 'CANCELLED',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
