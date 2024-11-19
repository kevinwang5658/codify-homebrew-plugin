import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

describe('Git lfs integration tests', async () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can install git-lfs', { timeout: 500000 }, async () => {
    await plugin.fullTest([
      { type: 'homebrew' },
      { type: 'git-lfs' }
    ], {
      validateApply: () => {
        const env = execSync('source ~/.zshrc; git lfs env;').toString('utf-8').trim();
        const envLines = env.split(/\n/);

        expect(envLines.at(-2)).to.contain('git config filter.lfs.smudge');
        expect(envLines.at(-1)).to.contain('git config filter.lfs.clean');
      },
      validateDestroy: () => {
        expect(() => execSync('source ~/.zshrc; which git lfs')).to.throw;
      }
    });
  })

  afterEach(() => {
    plugin.kill();
  })
})
