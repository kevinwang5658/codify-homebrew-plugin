import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';
import { TestUtils } from '../test-utils.js';

describe('Homebrew taps tests', () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can install homebrew and add a tap', { timeout: 300000 }, async () => {
    // Plans correctly and detects that brew is not installed
    await PluginTester.fullTest(pluginPath, [{
      type: 'homebrew',
      taps: ['cirruslabs/cli'],
    }], {
      validateApply: () => {
        expect(execSync(TestUtils.getShellCommand('brew tap'))
          .toString('utf-8')
          .trim()
          .split(/\n/)
        ).to.includes('cirruslabs/cli')
      },
      testModify: {
        modifiedConfigs: [{
          type: 'homebrew',
          taps: ['hashicorp/tap'],
        }],
        validateModify: () => {
          const taps = execSync(TestUtils.getShellCommand('brew tap'))
            .toString('utf-8')
            .trim()
            .split(/\n/)

          expect(taps).to.includes('cirruslabs/cli')
          expect(taps).to.includes('hashicorp/tap')
        },
      },
      validateDestroy: () => {
        expect(() => execSync(TestUtils.getShellCommand('which brew'))).to.throw;
      }
    });
  });
})
