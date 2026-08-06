import { ReviewMode } from '../core/index.js';
import { setLanguage } from '../config/language.js';
import { parseArguments } from './arguments.js';

describe('parseArguments', () => {
  it('uses working mode by default', () => {
    expect(parseArguments([])).toEqual({
      kind: 'run',
      options: {
        mode: ReviewMode.WORKING,
        baseBranch: 'main',
        format: 'html',
        openReport: true,
        projectContext: [],
      },
    });
  });

  it('parses branch options and repeated context', () => {
    expect(
      parseArguments([
        'branch',
        '--base',
        'develop',
        '--context',
        'NestJS',
        '-c',
        'Redis 없음',
        '--output',
        'review.html',
        '--format',
        'both',
        '--no-open',
        '--api-url',
        'https://api.example.com/v1',
        '--model',
        'qwen',
      ]),
    ).toEqual({
      kind: 'run',
      options: {
        mode: ReviewMode.BRANCH,
        baseBranch: 'develop',
        output: 'review.html',
        format: 'both',
        apiUrl: 'https://api.example.com/v1',
        model: 'qwen',
        openReport: false,
        projectContext: ['NestJS', 'Redis 없음'],
      },
    });
  });

  it.each([
    [['setup'], { kind: 'setup' }],
    [['config', 'show'], { kind: 'config-show' }],
    [
      ['config', 'set', 'api-url', 'https://api.example.com/v1'],
      { kind: 'config-set', key: 'api-url', value: 'https://api.example.com/v1' },
    ],
    [['config', 'set', 'model', 'qwen'], { kind: 'config-set', key: 'model', value: 'qwen' }],
    [['config', 'set', 'language', 'en'], { kind: 'config-set', key: 'language', value: 'en' }],
  ])('parses configuration command %j', (args, expected) => {
    expect(parseArguments(args)).toEqual(expected);
  });

  it('accepts --ollama-url as a backwards-compatible API URL alias', () => {
    expect(parseArguments(['--ollama-url', 'http://localhost:11434'])).toMatchObject({
      kind: 'run',
      options: { apiUrl: 'http://localhost:11434/v1' },
    });
  });

  it('rejects unknown arguments', () => {
    expect(() => parseArguments(['--unknown'])).toThrow('알 수 없는 인자입니다');
    expect(() => parseArguments(['--open'])).toThrow('알 수 없는 인자입니다');
  });

  it('accepts the update notification opt-out flag', () => {
    expect(parseArguments(['--no-update-notifier', '--version'])).toEqual({ kind: 'version' });
  });

  it('accepts --silent as a backwards-compatible alias for --no-open', () => {
    expect(parseArguments(['--silent'])).toMatchObject({
      kind: 'run',
      options: { openReport: false },
    });
  });

  it('rejects an unsupported output format', () => {
    expect(() => parseArguments(['--format', 'xml'])).toThrow('지원하지 않는 출력 형식입니다');
  });

  it('reports argument errors in English when English is selected', () => {
    setLanguage('en');
    try {
      expect(() => parseArguments(['--unknown'])).toThrow('Unknown argument');
    } finally {
      setLanguage('ko-KR');
    }
  });
});
