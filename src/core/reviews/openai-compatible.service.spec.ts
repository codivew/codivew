import { jest } from '@jest/globals';
import { ReviewError } from '../common/errors/review-error.js';
import { authenticationHeaders, OpenAICompatibleService } from './openai-compatible.service.js';

const prompts = { system: 'system', user: 'user' };

describe('OpenAICompatibleService', () => {
  const originalFetch = global.fetch;
  const service = new OpenAICompatibleService({
    baseUrl: 'https://api.example.com/v1/',
    model: 'review-model',
    authentication: { type: 'api-key', apiKey: 'test-key' },
    timeoutMs: 20,
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('uses the OpenAI chat completions contract and returns parsed structured content', async () => {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: '{"verdict":"approve"}' } }] }),
    } as Response);
    await expect(service.generateReview(prompts)).resolves.toEqual({ verdict: 'approve' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
    const request = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0]?.[1];
    expect(request?.headers).toMatchObject({ authorization: 'Bearer test-key' });
    const body = JSON.parse(request?.body as string) as {
      response_format: { type: string };
      stream?: boolean;
    };
    expect(body.response_format.type).toBe('json_schema');
    expect(body).not.toHaveProperty('stream');
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
      json: (): Promise<unknown> =>
        Promise.resolve({ choices: [{ message: { content: 'not-json' } }] }),
    },
    { ok: true, json: (): Promise<unknown> => Promise.resolve({ choices: [] }) },
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
      code: 'AI_PROVIDER_UNAVAILABLE',
    });
  });

  it('maps caller cancellation separately from a timeout', async () => {
    const controller = new AbortController();
    const cancellableService = new OpenAICompatibleService({
      baseUrl: 'https://api.example.com/v1',
      model: 'review-model',
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
    const cancelledService = new OpenAICompatibleService({
      baseUrl: 'https://api.example.com/v1',
      model: 'review-model',
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

describe('authenticationHeaders', () => {
  it('supports API key and Basic authentication', () => {
    expect(authenticationHeaders({ type: 'api-key', apiKey: 'secret' })).toEqual({
      authorization: 'Bearer secret',
    });
    expect(authenticationHeaders({ type: 'basic', username: 'user', password: 'pass' })).toEqual({
      authorization: 'Basic dXNlcjpwYXNz',
    });
    expect(authenticationHeaders({ type: 'none' })).toEqual({});
  });
});
