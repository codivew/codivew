import { ERROR_CODES, ReviewError, ReviewMode } from '../core/index.js';
import { t } from '../config/language.js';

export type CliOptions = {
  mode: ReviewMode;
  baseBranch: string;
  output?: string;
  format: OutputFormat;
  ollamaUrl?: string;
  model?: string;
  openReport: boolean;
  projectContext: string[];
};

export type OutputFormat = 'html' | 'json' | 'both';

export type ConfigKey = 'ollama-url' | 'model' | 'language';

export type CliCommand =
  | { kind: 'help' }
  | { kind: 'version' }
  | { kind: 'setup' }
  | { kind: 'config-show' }
  | { kind: 'config-set'; key: ConfigKey; value: string }
  | { kind: 'run'; options: CliOptions };

const MODES = new Set<string>(Object.values(ReviewMode));
const OUTPUT_FORMATS = new Set<OutputFormat>(['html', 'json', 'both']);

export function parseArguments(args: readonly string[]): CliCommand {
  if (args[0] === 'setup') {
    assertArgumentCount(args, 1, 'Usage: codivew setup');
    return { kind: 'setup' };
  }
  if (args[0] === 'config') return parseConfigCommand(args);

  const options: CliOptions = {
    mode: ReviewMode.WORKING,
    baseBranch: 'main',
    format: 'html',
    openReport: true,
    projectContext: [],
  };
  let modeSet = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') return { kind: 'help' };
    if (argument === '--version' || argument === '-v') return { kind: 'version' };
    if (argument === '--no-update-notifier') continue;
    if (argument === '--no-open' || argument === '--silent') {
      options.openReport = false;
      continue;
    }
    if (argument === '--base' || argument === '-b') {
      options.baseBranch = requiredValue(args, ++index, argument);
      continue;
    }
    if (argument === '--output' || argument === '-o') {
      options.output = requiredValue(args, ++index, argument);
      continue;
    }
    if (argument === '--format') {
      const format = requiredValue(args, ++index, argument);
      if (!OUTPUT_FORMATS.has(format as OutputFormat)) {
        throw new ReviewError(
          ERROR_CODES.INVALID_ARGUMENT,
          t('argument.unsupportedOutputFormat', { format }),
        );
      }
      options.format = format as OutputFormat;
      continue;
    }
    if (argument === '--ollama-url') {
      options.ollamaUrl = requiredValue(args, ++index, argument);
      continue;
    }
    if (argument === '--model') {
      options.model = requiredValue(args, ++index, argument);
      continue;
    }
    if (argument === '--context' || argument === '-c') {
      options.projectContext.push(requiredValue(args, ++index, argument));
      continue;
    }
    if (MODES.has(argument) && !modeSet) {
      options.mode = argument as ReviewMode;
      modeSet = true;
      continue;
    }
    throw new ReviewError(ERROR_CODES.INVALID_ARGUMENT, t('argument.unknown', { argument }));
  }

  if (options.projectContext.length > 20) {
    throw new ReviewError(ERROR_CODES.INVALID_ARGUMENT, t('argument.contextLimit'));
  }

  return { kind: 'run', options };
}

function parseConfigCommand(args: readonly string[]): CliCommand {
  if (args[1] === 'show') {
    assertArgumentCount(args, 2, 'Usage: codivew config show');
    return { kind: 'config-show' };
  }
  if (args[1] === 'set') {
    assertArgumentCount(args, 4, 'Usage: codivew config set <ollama-url|model|language> <value>');
    const key = args[2];
    if (key !== 'ollama-url' && key !== 'model' && key !== 'language') {
      throw new ReviewError(
        ERROR_CODES.INVALID_ARGUMENT,
        t('argument.unsupportedConfigKey', { key }),
      );
    }
    return { kind: 'config-set', key, value: args[3] };
  }
  throw new ReviewError(
    ERROR_CODES.INVALID_ARGUMENT,
    'Usage: codivew config <show|set> [ollama-url|model|language] [value]',
  );
}

function assertArgumentCount(args: readonly string[], expected: number, usage: string): void {
  if (args.length !== expected) {
    throw new ReviewError(ERROR_CODES.INVALID_ARGUMENT, usage);
  }
}

function requiredValue(args: readonly string[], index: number, option: string): string {
  const value = args[index];
  if (value === undefined || value.startsWith('-')) {
    throw new ReviewError(ERROR_CODES.INVALID_ARGUMENT, t('argument.valueRequired', { option }));
  }
  return value;
}
