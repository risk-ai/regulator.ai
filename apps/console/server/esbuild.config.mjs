import { build } from 'esbuild';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

// External: ONLY native modules that must be loaded at runtime
const external = [
  'better-sqlite3',  // Native module
  'bcrypt',          // Native module
  'sharp',           // Native module
  ...Object.keys(pkg.dependencies || {}).filter(dep => 
    dep.startsWith('@types/') || 
    dep === 'typescript' ||
    dep === 'tsx'
  )
];

await build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',  // Changed to CommonJS
  outfile: 'build/server.cjs',  // Single output file
  sourcemap: true,
  external,
  minify: false,
  logLevel: 'info',
  banner: {
    js: `
const { createRequire } = require('module');
const { fileURLToPath } = require('url');
const { dirname } = require('path');
// Polyfill import.meta for CommonJS
const importMetaUrl = typeof __filename !== 'undefined' ? require('url').pathToFileURL(__filename).href : undefined;
    `.trim()
  },
  define: {
    'import.meta.url': 'importMetaUrl'
  }
  // Bundle everything except what's in external array
});

console.log('✅ Backend bundled successfully to build/');
