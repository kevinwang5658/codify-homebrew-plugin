import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';

describe('Homebrew taps tests', () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can install homebrew and add a tap', { timeout: 300000 }, async () => {
    // Plans correctly and detects that brew is not installed
    await plugin.fullTest([{
      type: 'homebrew',
      taps: ['cirruslabs/cli'],
    }], {
      skipUninstall: true,
      validateApply: () => {
        expect(execSync('source ~/.zshrc; brew tap')
          .toString('utf-8')
          .trim()
          .split(/\n/)
        ).to.includes('cirruslabs/cli')
      }
    });
  });

  it ('Can install additional taps', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: 'homebrew',
      taps: ['hashicorp/tap'],
    }], {
      validateApply: () => {
        const taps = execSync('source ~/.zshrc; brew tap')
          .toString('utf-8')
          .trim()
          .split(/\n/)

        expect(taps).to.includes('cirruslabs/cli')
        expect(taps).to.includes('hashicorp/tap')
      },
      validateDestroy: () => {
        expect(() => execSync('source ~/.zshrc; which brew')).to.throw;
      }
    })
  })

  afterEach(() => {
    plugin.kill();
  })
})
