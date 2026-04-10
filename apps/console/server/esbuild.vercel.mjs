import { build } from 'esbuild';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: ['src/vercel-entry.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: '../client/api/backend.js',
  sourcemap: false,
  external: [
    '@vercel/node',    // Provided by Vercel runtime
  ],
  minify: false,
  logLevel: 'info',
  // Use plugins to replace SQLite imports with Postgres versions
  plugins: [{
    name: 'replace-sqlite',
    setup(build) {
      build.onResolve({ filter: /chatHistoryService/ }, args => {
        if (!args.path.includes('postgres')) {
          return { path: args.path.replace('chatHistoryService', 'chatHistoryService.postgres'), external: false };
        }
      });
      // Stub out better-sqlite3 
      build.onResolve({ filter: /^better-sqlite3$/ }, () => {
        return { path: 'better-sqlite3', namespace: 'stub' };
      });
      build.onLoad({ filter: /.*/, namespace: 'stub' }, () => {
        return { contents: 'module.exports = function() { throw new Error("SQLite not available in serverless mode"); };' };
      });
    }
  }],
  define: {
    'import.meta.url': '"file:///var/task/api/server.js"'
  },
  banner: {
    js: `
// Vercel serverless compatibility
    `.trim()
  },
});

console.log('✅ Serverless bundle built');
