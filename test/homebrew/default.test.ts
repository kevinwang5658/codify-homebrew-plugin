import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';

describe('Homebrew main resource integration tests', () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Creates brew', { timeout: 300000 }, async () => {
    // Plans correctly and detects that brew is not installed
    await plugin.fullTest([{
      type: 'homebrew',
      formulae: [
        'apr',
        'sshpass'
      ]
    }], {
      skipUninstall: true,
      validateApply: () => {
        expect(() => execSync('source ~/.zshrc; which apr')).to.not.throw;
        expect(() => execSync('source ~/.zshrc; which sshpass')).to.not.throw;
        expect(() => execSync('source ~/.zshrc; which brew')).to.not.throw;
      }
    });
  });

  it ('Can install additional casks and formulas', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: 'homebrew',
      formulae: [
        'libxau',
        'sshpass',
        'jenv',
      ],
    }], {
      skipUninstall: true,
      validateApply: () => {
        expect(() => execSync('source ~/.zshrc; which libxau')).to.not.throw;
        expect(() => execSync('source ~/.zshrc; which sshpass')).to.not.throw;
        expect(() => execSync('source ~/.zshrc; which jenv')).to.not.throw;
        expect(() => execSync('source ~/.zshrc; which brew')).to.not.throw;
      }
    })
  })

  it ('Can handle fully qualified formula names (tap + formula)', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: 'homebrew',
      formulae: [
        'cirruslabs/cli/softnet',
      ],
    }], {
      validateApply: () => {
        expect(() => execSync('source ~/.zshrc; which softnet')).to.not.throw;
      },
      validateDestroy: () => {
        expect(() => execSync('source ~/.zshrc; which softnet')).to.throw;
        expect(() => execSync('source ~/.zshrc; which brew')).to.throw;
      }
    })
  })

  afterEach(() => {
    plugin.kill();
  })
})
