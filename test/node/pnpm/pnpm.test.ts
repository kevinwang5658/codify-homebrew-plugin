import { describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

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
})
