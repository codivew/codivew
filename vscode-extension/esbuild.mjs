import { build } from 'esbuild';

await Promise.all([
  build({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    outfile: 'dist/extension.cjs',
    external: ['vscode'],
    sourcemap: true,
    logLevel: 'info',
  }),
  build({
    entryPoints: ['src/webview/main.tsx'],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'es2022',
    outfile: 'dist/webview.js',
    minify: true,
    logLevel: 'info',
  }),
]);
