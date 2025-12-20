import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';
import { TestUtils } from '../test-utils.js';

describe('Homebrew custom install integration tests', () => {
  const pluginPath = path.resolve('./src/index.ts');

  it ('Creates brew in a custom location', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [{
      type: 'homebrew',
      directory: '~/.homebrew',
      formulae: [
        'jenv',
      ],
    }], {
      validateApply: () => {
        expect(() => execSync(TestUtils.getShellCommand('which jenv'))).to.not.throw;
        expect(() => execSync(TestUtils.getShellCommand('which brew'))).to.not.throw;
      }
    })
  })
})
