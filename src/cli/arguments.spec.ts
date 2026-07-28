import { ReviewMode } from '../reviews/types/review-request.js';
import { parseArguments } from './arguments.js';

describe('parseArguments', () => {
  it('uses working mode by default', () => {
    expect(parseArguments([])).toEqual({
      kind: 'run',
      options: {
        mode: ReviewMode.WORKING,
        baseBranch: 'main',
        silent: false,
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
        '--silent',
        '--ollama-url',
        'http://ollama.test:11434',
        '--model',
        'qwen',
      ]),
    ).toEqual({
      kind: 'run',
      options: {
        mode: ReviewMode.BRANCH,
        baseBranch: 'develop',
        output: 'review.html',
        ollamaUrl: 'http://ollama.test:11434',
        model: 'qwen',
        silent: true,
        projectContext: ['NestJS', 'Redis 없음'],
      },
    });
  });

  it.each([
    [['setup'], { kind: 'setup' }],
    [['config', 'show'], { kind: 'config-show' }],
    [
      ['config', 'set', 'ollama-url', 'http://localhost:11434'],
      { kind: 'config-set', key: 'ollama-url', value: 'http://localhost:11434' },
    ],
    [['config', 'set', 'model', 'qwen'], { kind: 'config-set', key: 'model', value: 'qwen' }],
  ])('parses configuration command %j', (args, expected) => {
    expect(parseArguments(args)).toEqual(expected);
  });

  it('rejects unknown arguments', () => {
    expect(() => parseArguments(['--unknown'])).toThrow('알 수 없는 인자입니다');
    expect(() => parseArguments(['--open'])).toThrow('알 수 없는 인자입니다');
  });
});
