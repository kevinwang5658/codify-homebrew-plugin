import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import fs from 'node:fs/promises';

describe('Vscode integration tests', async () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can install vscode', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: 'vscode',
      directory: '/Applications'
    }], {
      validateApply: async () => {
        const programPath = '/Applications/Visual Studio Code.app'
        const lstat = await fs.lstat(programPath);
        expect(lstat.isDirectory()).to.be.true;
      },
      validateDestroy: async () => {
        const programPath = '/Applications/Visual Studio Code.app'
        expect(async () => await fs.lstat(programPath)).to.throw;
      }
    });
  })
  
  afterEach(() => {
    plugin.kill();
  })
})
