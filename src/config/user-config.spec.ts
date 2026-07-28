import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
    await saveUserConfig({ ollamaUrl: 'http://localhost:11434/', model: 'qwen' }, configPath);
    await expect(loadUserConfig(configPath)).resolves.toEqual({
      ollamaUrl: 'http://localhost:11434',
      model: 'qwen',
    });
    expect(await readFile(configPath, 'utf8')).toContain('"ollamaUrl"');
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
