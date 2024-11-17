import { beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import cp from 'child_process';

describe('Test aws-cli', async () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can install aws-cli', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      { type: 'homebrew' },
      { type: 'aws-cli' },
    ], {
      validateApply: async () => {
        expect(() => cp.execSync('source ~/.zshrc; which aws;')).to.not.throw;

      },
      validateDestroy: async () => {
        expect(() => cp.execSync('source ~/.zshrc; which aws;')).to.throw;
      }
    })
  })
})
