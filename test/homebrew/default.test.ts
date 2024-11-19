import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';

describe('Homebrew main resource integration tests', () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Creates brew and can install formulas', { timeout: 300000 }, async () => {
    // Plans correctly and detects that brew is not installed
    await plugin.fullTest([{
      type: 'homebrew',
      formulae: [
        'apr',
        'sshpass'
      ]
    }], {
      validateApply: () => {
        expect(() => execSync('source ~/.zshrc; which apr')).to.not.throw;
        expect(() => execSync('source ~/.zshrc; which sshpass')).to.not.throw;
        expect(() => execSync('source ~/.zshrc; which brew')).to.not.throw;
      },
      testModify: {
        modifiedConfigs: [{
          type: 'homebrew',
          formulae: [
            'libxau',
            'sshpass',
            'jenv',
            'cirruslabs/cli/softnet', // Test that it can handle a fully qualified name (tap + name)
          ],
        }],
        validateModify: () => {
          expect(() => execSync('source ~/.zshrc; which libxau')).to.not.throw;
          expect(() => execSync('source ~/.zshrc; which sshpass')).to.not.throw;
          expect(() => execSync('source ~/.zshrc; which jenv')).to.not.throw;
          expect(() => execSync('source ~/.zshrc; which brew')).to.not.throw;
          expect(() => execSync('source ~/.zshrc; which softnet')).to.not.throw;
        }
      },
      validateDestroy: () => {
        expect(() => execSync('source ~/.zshrc; which libxau')).to.throw;
        expect(() => execSync('source ~/.zshrc; which sshpass')).to.throw;
        expect(() => execSync('source ~/.zshrc; which jenv')).to.throw;
        expect(() => execSync('source ~/.zshrc; which softnet')).to.throw;
        expect(() => execSync('source ~/.zshrc; which brew')).to.throw;
      }
    });
  });

  afterEach(() => {
    plugin.kill();
  })
})
