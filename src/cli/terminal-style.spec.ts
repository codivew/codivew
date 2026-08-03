import { createTerminalStyle, shouldUseColor } from './terminal-style.js';

describe('terminalStyle', () => {
  it('adds ANSI colors when enabled', () => {
    expect(createTerminalStyle(true).green('완료')).toBe('\u001B[32m완료\u001B[0m');
  });

  it('returns plain text when disabled', () => {
    expect(createTerminalStyle(false).green('완료')).toBe('완료');
  });

  it('uses colors only for compatible TTY output', () => {
    expect(shouldUseColor({ isTTY: true }, {})).toBe(true);
    expect(shouldUseColor({ isTTY: false }, {})).toBe(false);
    expect(shouldUseColor({ isTTY: true }, { NO_COLOR: '' })).toBe(false);
    expect(shouldUseColor({ isTTY: true }, { TERM: 'dumb' })).toBe(false);
  });
});
