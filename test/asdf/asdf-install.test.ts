import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import cp from 'child_process';

describe('Asdf install tests', async () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can install a .tool-versions file', { timeout: 300000 }, async () => {
    await fs.mkdir(path.join(os.homedir(), 'toolDir'));
    await fs.writeFile(
      path.join(os.homedir(), 'toolDir', '.tool-versions'),
      'nodejs 22.9.0\n' +
      'golang 1.23.2'
    )

    await plugin.fullTest([
      {
        type: 'asdf',
      },
      {
        type: 'asdf-install',
        directory: '~/toolDir',
      },
    ], {
      validateApply: async () => {
        expect(() => cp.execSync('source ~/.zshrc; which asdf;')).to.not.throw;
        expect(() => cp.execSync('source ~/.zshrc; which node')).to.not.throw;
        expect(() => cp.execSync('source ~/.zshrc; which golang')).to.not.throw;

      },
      validateDestroy: async () => {
        expect(() => cp.execSync('source ~/.zshrc; which asdf;')).to.throw;
        expect(() => cp.execSync('source ~/.zshrc; which node')).to.throw;
        expect(() => cp.execSync('source ~/.zshrc; which golang')).to.throw;
      }
    });
  })

  it('Can install a plugin and then a version', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      {
        type: 'asdf',
        plugins: ['nodejs']
      },
      {
        type: 'asdf-install',
        plugin: 'nodejs',
        versions: ['20.18.0']
      },
    ], {
      validateApply: async () => {
        expect(() => cp.execSync('source ~/.zshrc; which asdf;')).to.not.throw;
        expect(() => cp.execSync('source ~/.zshrc; which node')).to.not.throw;
      },
      validateDestroy: async () => {
        expect(() => cp.execSync('source ~/.zshrc; which asdf;')).to.throw;
        expect(() => cp.execSync('source ~/.zshrc; which node')).to.throw;
      }
    });
  })

  afterEach(() => {
    plugin.kill();
  })
})
