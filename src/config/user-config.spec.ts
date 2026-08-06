import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getUserConfigPath, loadUserConfig, saveUserConfig } from './user-config.js';

describe('user config', () => {
  let directory: string;
  let configPath: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'codivew-config-test-'));
    configPath = join(directory, 'nested', 'config.json');
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('saves and loads normalized configuration', async () => {
    await saveUserConfig(
      {
        apiUrl: 'https://api.example.com/v1/',
        model: 'qwen',
        language: 'en',
        authentication: { type: 'api-key', apiKey: 'secret' },
      },
      configPath,
    );
    await expect(loadUserConfig(configPath)).resolves.toEqual({
      apiUrl: 'https://api.example.com/v1',
      model: 'qwen',
      language: 'en',
      authentication: { type: 'api-key', apiKey: 'secret' },
    });
    expect(await readFile(configPath, 'utf8')).toContain('"apiUrl"');
  });

  it('migrates an Ollama configuration to its OpenAI-compatible endpoint', async () => {
    await mkdir(join(directory, 'nested'));
    await writeFile(
      configPath,
      JSON.stringify({ ollamaUrl: 'http://localhost:11434', model: 'qwen', language: 'ko-KR' }),
      'utf8',
    );
    await expect(loadUserConfig(configPath)).resolves.toEqual({
      apiUrl: 'http://localhost:11434/v1',
      model: 'qwen',
      language: 'ko-KR',
      authentication: { type: 'none' },
    });
  });

  it('returns undefined when the file does not exist', async () => {
    await expect(loadUserConfig(configPath)).resolves.toBeUndefined();
  });

  it('rejects malformed configuration', async () => {
    await writeFile(configPath, '{invalid', 'utf8').catch(async () => {
      await saveUserConfig({}, configPath);
      await writeFile(configPath, '{invalid', 'utf8');
    });
    await expect(loadUserConfig(configPath)).rejects.toMatchObject({ code: 'CONFIG_INVALID' });
  });

  it('uses platform-specific locations', () => {
    expect(getUserConfigPath('darwin', {}, '/home/test')).toBe(
      '/home/test/Library/Application Support/Codivew/config.json',
    );
    expect(getUserConfigPath('linux', { XDG_CONFIG_HOME: '/config' }, '/home/test')).toBe(
      '/config/codivew/config.json',
    );
  });
});
