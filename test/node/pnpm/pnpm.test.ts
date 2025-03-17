import { describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { codifySpawn } from '../../../src/utils/codify-spawn';

describe('Pnpm tests', () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can install and uninstall pnpm', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      { type: 'pnpm' },
    ], {
      validateDestroy: async () => {
        const zshFile = fs.readFileSync(path.join(os.homedir(), '.zshrc'), 'utf8')
        expect(zshFile.trim()).to.eq('');
      }
    })
  })

  it('Can install nodeJS via pnpm', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      { type: 'pnpm', globalEnvNodeVersion: '20' },
    ], {
      validateApply: async () => {
        const result = await codifySpawn('node -v');
        expect(result.data.trim()).to.include('20')
      },
      validateDestroy: async () => {
        const zshFile = fs.readFileSync(path.join(os.homedir(), '.zshrc'), 'utf8')
        expect(zshFile.trim()).to.eq('');
      }
    })
  })
})
