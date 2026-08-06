/** @type {import('jest').Config} */
const config = {
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  rootDir: '.',
  testRegex: 'src/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'Node',
          jsx: 'react-jsx',
          jsxImportSource: 'preact',
        },
      },
    ],
  },
  moduleNameMapper: {
    '^shiki$': '<rootDir>/shiki.jest.cjs',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/main.ts'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
};

export default config;
