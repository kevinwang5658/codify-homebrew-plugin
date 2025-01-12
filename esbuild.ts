import { build } from 'esbuild';

const result = await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: false,
  splitting: true,
  platform: 'node',
  outdir: 'dist',
  format: 'esm',
  loader: {
    '.node': 'file',
    '.cc': 'file',
  },
  // external: ['node-pty'],
  // packages: 'external',
  logLevel: 'debug',
});

console.log(result);
