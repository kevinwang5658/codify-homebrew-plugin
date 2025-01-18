import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';

describe('Pgcli integration tests', async () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can install pgcli', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      { type: 'homebrew' },
      { type: 'pgcli' }
    ], {
      validateApply: () => {
        expect(() => execSync('source ~/.zshrc; which pgcli', { shell: 'zsh' })).to.not.throw();
        expect(() => execSync('source ~/.zshrc; pgcli -v', { shell: 'zsh' })).to.not.throw();
      },
      validateDestroy: () => {
        expect(() => execSync('source ~/.zshrc; which pgcli', { shell: 'zsh' })).to.throw();
        expect(() => execSync('source ~/.zshrc; pgcli -v', { shell: 'zsh' })).to.throw();
      }
    })
  })
})
