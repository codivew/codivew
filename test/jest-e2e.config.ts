import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  testRegex: String.raw`test/.*\.e2e-spec\.ts$`,
  transform: { [String.raw`^.+\.(t|j)s$`]: 'ts-jest' },
  testEnvironment: 'node',
};

export default config;
