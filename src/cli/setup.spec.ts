import { jest } from '@jest/globals';
import { listOllamaModels } from './setup.js';

describe('listOllamaModels', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns unique installed model names', async () => {
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: (): Promise<unknown> =>
        Promise.resolve({ models: [{ name: 'qwen' }, { model: 'deepseek' }, { name: 'qwen' }] }),
    } as Response);
    global.fetch = fetchMock;
    await expect(listOllamaModels('http://ollama.test/')).resolves.toEqual(['qwen', 'deepseek']);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://ollama.test/api/tags');
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('rejects unavailable Ollama', async () => {
    global.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue({ ok: false, status: 503 } as Response);
    await expect(listOllamaModels('http://ollama.test')).rejects.toMatchObject({
      code: 'OLLAMA_UNAVAILABLE',
    });
  });
});
