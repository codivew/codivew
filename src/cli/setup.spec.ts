import { jest } from '@jest/globals';
import { listModels, parseAuthenticationSelection, parseLanguageSelection } from './setup.js';

describe('listModels', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns unique model IDs with authentication', async () => {
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: (): Promise<unknown> =>
        Promise.resolve({ data: [{ id: 'qwen' }, { id: 'deepseek' }, { id: 'qwen' }] }),
    } as Response);
    global.fetch = fetchMock;
    await expect(
      listModels('https://api.example.com/v1/', { type: 'api-key', apiKey: 'secret' }),
    ).resolves.toEqual(['qwen', 'deepseek']);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.example.com/v1/models');
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({ authorization: 'Bearer secret' });
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('rejects an unavailable API', async () => {
    global.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue({ ok: false, status: 503 } as Response);
    await expect(listModels('https://api.example.com/v1')).rejects.toMatchObject({
      code: 'AI_PROVIDER_UNAVAILABLE',
    });
  });
});

describe('parseAuthenticationSelection', () => {
  it.each([
    ['', 'api-key', 'api-key'],
    ['1', 'basic', 'none'],
    ['2', 'none', 'api-key'],
    ['3', 'none', 'basic'],
    ['basic', 'none', 'basic'],
  ] as const)('maps %j with default %s to %s', (answer, current, expected) => {
    expect(parseAuthenticationSelection(answer, current)).toBe(expected);
  });

  it('rejects unsupported authentication types', () => {
    expect(parseAuthenticationSelection('digest', 'none')).toBeUndefined();
  });
});

describe('parseLanguageSelection', () => {
  it.each([
    ['', 'ko-KR', 'ko-KR'],
    ['', 'en', 'en'],
    ['1', 'en', 'ko-KR'],
    ['2', 'ko-KR', 'en'],
    ['ko-KR', 'en', 'ko-KR'],
    ['en', 'ko-KR', 'en'],
  ] as const)('maps %j with default %s to %s', (answer, defaultLanguage, expected) => {
    expect(parseLanguageSelection(answer, defaultLanguage)).toBe(expected);
  });

  it('rejects unsupported languages', () => {
    expect(parseLanguageSelection('ja', 'ko-KR')).toBeUndefined();
  });
});
