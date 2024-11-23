import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';
import fs from 'node:fs/promises';
import os from 'node:os';

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

  it('Can handle casks that were already installed by skipping in the plan', { timeout: 300000 }, async () => {
    // Install vscode outside of cask
    await plugin.fullTest([{
      type: 'vscode',
    }, {
      type: 'homebrew'
    }], {
      skipUninstall: true,
      validateApply: async () => {
        const programPath = '/Applications/Visual Studio Code.app'
        const lstat = await fs.lstat(programPath);
        expect(lstat.isDirectory()).to.be.true;
      }
    })

    // Without skipping vscode install this should throw
    await plugin.fullTest([{
      type: 'homebrew',
      casks: ['visual-studio-code'],
    }], {
      validateApply: async (plans) => {
        // Even though vscode was not installed via brew, it'll return true so that Codify won't attempt to install it
        expect(plans[0]).toMatchObject({
          "operation": "noop",
          "resourceType": "homebrew",
          "parameters": [
            {
              "name": "casks",
              "previousValue": [
                "visual-studio-code"
              ],
              "newValue": [
                "visual-studio-code"
              ],
              "operation": "noop"
            },
            {
              "name": "skipAlreadyInstalledCasks",
              "previousValue": null,
              "newValue": true,
              "operation": "noop"
            }
          ]
        })

        const programPath = '/Applications/Visual Studio Code.app'
        const lstat = await fs.lstat(programPath);
        expect(lstat.isDirectory()).to.be.true;
      }, validateDestroy: async () => {
        const programPath = '/Applications/Visual Studio Code.app'
        const lstat = await fs.lstat(programPath);
        expect(lstat.isDirectory()).to.be.true;
      }
    })

    expect(async () => await plugin.fullTest([{
      type: 'homebrew',
      casks: ['visual-studio-code'],
      skipAlreadyInstalledCasks: false,
    }])).rejects.toThrowError();

    await plugin.uninstall([{
      type: 'vscode',
    }])
  })

  it('Can handle casks that were already installed by skipping in the install (only applicable to the initial)', { timeout: 300000 }, async () => {
    // Install vscode outside of cask
    await plugin.fullTest([{
      type: 'vscode',
    }, {
      type: 'homebrew',
      casks: ['visual-studio-code'],
    }], {
      validateApply: async (plans) => {
        expect(plans[0]).toMatchObject({
          "operation": "create",
          "resourceType": "vscode",
        })

        expect(plans[1]).toMatchObject({
          "operation": "create",
          "resourceType": "homebrew",
          "parameters": expect.arrayContaining([
            {
              "name": "casks",
              "previousValue": null,
              "newValue": ["visual-studio-code"],
              "operation": "add"
            }
          ])
        })

        const programPath = '/Applications/Visual Studio Code.app'
        const lstat = await fs.lstat(programPath);
        expect(lstat.isDirectory()).to.be.true;
      },
      validateDestroy: async () => {
        const programPath = '/Applications/Visual Studio Code.app'
        expect(async () => await fs.lstat(programPath)).to.throw;
        expect((await fs.readFile(path.join(os.homedir(), '.zshrc'))).toString('utf-8')).to.not.include('homebrew')
      }
    })
  })

  afterEach(() => {
    plugin.kill();
  })
})
