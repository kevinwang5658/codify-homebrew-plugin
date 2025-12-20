import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import { TestUtils } from '../test-utils.js';

describe('Homebrew main resource integration tests', () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Creates brew and can install formulas', { timeout: 300000 }, async () => {
    // Plans correctly and detects that brew is not installed
    await PluginTester.fullTest(pluginPath, [{
      type: 'homebrew',
      formulae: [
        'apr',
        'sshpass'
      ]
    }], {
      validateApply: () => {
        expect(() => execSync(TestUtils.getShellCommand('which apr'))).to.not.throw;
        expect(() => execSync(TestUtils.getShellCommand('which sshpass'))).to.not.throw;
        expect(() => execSync(TestUtils.getShellCommand('which brew'))).to.not.throw;
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
          expect(() => execSync(TestUtils.getShellCommand('which libxau'))).to.not.throw;
          expect(() => execSync(TestUtils.getShellCommand('which sshpass'))).to.not.throw;
          expect(() => execSync(TestUtils.getShellCommand('which jenv'))).to.not.throw;
          expect(() => execSync(TestUtils.getShellCommand('which brew'))).to.not.throw;
          expect(() => execSync(TestUtils.getShellCommand('which softnet'))).to.not.throw;
        }
      },
      validateDestroy: () => {
        expect(() => execSync(TestUtils.getShellCommand('which libxau'))).to.throw;
        expect(() => execSync(TestUtils.getShellCommand('which sshpass'))).to.throw;
        expect(() => execSync(TestUtils.getShellCommand('which jenv'))).to.throw;
        expect(() => execSync(TestUtils.getShellCommand('which softnet'))).to.throw;
        expect(() => execSync(TestUtils.getShellCommand('which brew'))).to.throw;
      }
    });
  });

  it('Can handle casks that were already installed by skipping in the plan', { timeout: 300000 }, async () => {
    // Install vscode outside of cask
    await PluginTester.fullTest(pluginPath, [{
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
    await PluginTester.fullTest(pluginPath, [{
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
            },
            {
              "name": "onlyPlanUserInstalled",
              "newValue": true,
              "operation": "noop",
              "previousValue": null,
            },
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

    await expect(async () => PluginTester.fullTest(pluginPath, [{
      type: 'homebrew',
      casks: ['visual-studio-code'],
      skipAlreadyInstalledCasks: false,
    }])).rejects.toThrowError();

    await PluginTester.uninstall(pluginPath, [{
      type: 'vscode',
    }, {
      type: 'homebrew',
    }])
  })

  it('Can handle casks that were already installed by skipping in the install (only applicable to the initial)', { timeout: 300000 }, async () => {
    // Install vscode outside of cask
    await PluginTester.fullTest(pluginPath, [{
      type: 'vscode',
    }, {
      type: 'homebrew',
      casks: ['visual-studio-code'],
      dependsOn: ['vscode']
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
        expect((await fs.readFile(TestUtils.getPrimaryShellRc())).toString('utf-8')).to.not.include('homebrew')
      }
    })
  })
})
