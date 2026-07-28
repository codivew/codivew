import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = fileURLToPath(new URL('.', import.meta.url));
const distDirectory = resolve(scriptsDirectory, '..', 'dist');
await rm(distDirectory, { recursive: true, force: true });
