import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';
import { TestUtils } from '../test-utils.js';

describe('Yum resource integration tests', () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can install and uninstall yum packages', { timeout: 300000 }, async () => {
    if (!TestUtils.isLinux()) {
      console.log('Skipping yum test - not running on Linux');
      return;
    }

    // Check if yum is available
    try {
      execSync('which yum');
    } catch {
      console.log('Skipping yum test - yum not available on this system');
      return;
    }

    // Plans correctly and detects that yum is available
    await PluginTester.fullTest(pluginPath, [{
      type: 'yum',
      install: [
        'curl',
        'wget',
        'vim-enhanced',
      ]
    }], {
      skipUninstall: true,
      validateApply: () => {
        expect(() => execSync(TestUtils.getShellCommand('which curl'))).to.not.throw;
        expect(() => execSync(TestUtils.getShellCommand('which wget'))).to.not.throw;
        expect(() => execSync(TestUtils.getShellCommand('which vim'))).to.not.throw;
        expect(() => execSync(TestUtils.getShellCommand('which yum'))).to.not.throw;
      },
      testModify: {
        modifiedConfigs: [{
          type: 'yum',
          install: [
            'curl',
            'git'
          ],
        }],
        validateModify: () => {
          expect(() => execSync(TestUtils.getShellCommand('which curl'))).to.not.throw;
          expect(() => execSync(TestUtils.getShellCommand('which git'))).to.not.throw;
          expect(() => execSync(TestUtils.getShellCommand('which htop'))).to.not.throw;
          // wget and vim should be removed
          expect(() => execSync(TestUtils.getShellCommand('which wget'))).to.throw;
          expect(() => execSync(TestUtils.getShellCommand('which vim'))).to.throw;
        }
      },
      validateDestroy: () => {
        // yum should still exist as it's a core system component
        expect(() => execSync(TestUtils.getShellCommand('which yum'))).to.not.throw;
      }
    });
  });

  it('Can install packages with specific versions', { timeout: 300000, skip: true }, async () => {
    if (!TestUtils.isLinux()) {
      console.log('Skipping yum test - not running on Linux');
      return;
    }

    // Check if yum is available
    try {
      execSync('which yum');
    } catch {
      console.log('Skipping yum test - yum not available on this system');
      return;
    }

    // Get available version of a package
    const availableVersions = execSync('yum list available curl | tail -1 | awk \'{print $2}\'').toString().trim();

    await PluginTester.fullTest(pluginPath, [{
      type: 'yum',
      install: [
        { name: 'curl', version: availableVersions }
      ]
    }], {
      skipUninstall: true,
      validateApply: () => {
        expect(() => execSync(TestUtils.getShellCommand('which curl'))).to.not.throw;
        const installedVersion = execSync('rpm -q --queryformat \'%{VERSION}-%{RELEASE}\' curl').toString().trim();
        expect(installedVersion).toBe(availableVersions);
      },
    });
  });

  it('Can skip yum check-update when update is false', { timeout: 300000 }, async () => {
    if (!TestUtils.isLinux()) {
      console.log('Skipping yum test - not running on Linux');
      return;
    }

    // Check if yum is available
    try {
      execSync('which yum');
    } catch {
      console.log('Skipping yum test - yum not available on this system');
      return;
    }

    await PluginTester.fullTest(pluginPath, [{
      type: 'yum',
      install: ['curl'],
      update: false
    }], {
      skipUninstall: true,
      validateApply: () => {
        expect(() => execSync(TestUtils.getShellCommand('which curl'))).to.not.throw;
      },
    });
  });
});
