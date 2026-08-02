import { stderr, stdout } from 'node:process';
import type { WriteStream } from 'node:tty';

const ANSI = {
  reset: '\u001B[0m',
  bold: '\u001B[1m',
  dim: '\u001B[2m',
  red: '\u001B[31m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  blue: '\u001B[34m',
  magenta: '\u001B[35m',
  cyan: '\u001B[36m',
  gray: '\u001B[90m',
} as const;

type ColorEnvironment = NodeJS.ProcessEnv;

export type TerminalStyle = {
  enabled: boolean;
  bold(text: string): string;
  dim(text: string): string;
  red(text: string): string;
  green(text: string): string;
  yellow(text: string): string;
  blue(text: string): string;
  magenta(text: string): string;
  cyan(text: string): string;
  gray(text: string): string;
};

export function shouldUseColor(
  stream: Pick<WriteStream, 'isTTY'>,
  environment: ColorEnvironment = process.env,
): boolean {
  return stream.isTTY === true && environment.NO_COLOR === undefined && environment.TERM !== 'dumb';
}

export function createTerminalStyle(enabled: boolean): TerminalStyle {
  const paint = (code: string, text: string): string =>
    enabled ? `${code}${text}${ANSI.reset}` : text;

  return {
    enabled,
    bold: (text: string): string => paint(ANSI.bold, text),
    dim: (text: string): string => paint(ANSI.dim, text),
    red: (text: string): string => paint(ANSI.red, text),
    green: (text: string): string => paint(ANSI.green, text),
    yellow: (text: string): string => paint(ANSI.yellow, text),
    blue: (text: string): string => paint(ANSI.blue, text),
    magenta: (text: string): string => paint(ANSI.magenta, text),
    cyan: (text: string): string => paint(ANSI.cyan, text),
    gray: (text: string): string => paint(ANSI.gray, text),
  };
}

export const outputStyle = createTerminalStyle(shouldUseColor(stdout));
export const errorStyle = createTerminalStyle(shouldUseColor(stderr));
