import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';

export default {
  input: 'src/index.ts',
  output: {
    dir:'dist',
    format: 'cjs'
  },
  external: ['node-pty'],
  plugins: [
    json(),
    replace({
      preventAssignment: true,
      values: {
        'node-pty': 'pty.node',
      }
    }),
    nodeResolve({ exportConditions: ['node'] }),
    typescript(),
    commonjs(),
    terser()
  ]
}
