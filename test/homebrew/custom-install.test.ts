import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';

describe('Homebrew custom install integration tests', () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it ('Creates brew in a custom location', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: 'homebrew',
      directory: '~/.homebrew',
      formulae: [
        'jenv',
      ],
    }], {
      validateApply: () => {
        expect(() => execSync('source ~/.zshrc; which jenv')).to.not.throw;
        expect(() => execSync('source ~/.zshrc; which brew')).to.not.throw;
      }
    })
  })

  afterEach(() => {
    plugin.kill();
  })
})
