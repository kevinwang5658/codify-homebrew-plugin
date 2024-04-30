import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.ts',
  output: {
    dir:'dist',
    format: 'cjs'
  },
  plugins: [
    json(),
    nodeResolve(),
    typescript(),
    commonjs(),
    terser()
  ]
}
