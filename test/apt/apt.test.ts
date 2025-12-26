import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';
import { TestUtils } from '../test-utils.js';

describe('Apt resource integration tests', () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can install and uninstall apt packages', { timeout: 300000 }, async () => {
    if (!TestUtils.isLinux()) {
      console.log('Skipping apt test - not running on Linux');
      return;
    }

    // Plans correctly and detects that apt is available
    await PluginTester.fullTest(pluginPath, [{
      type: 'apt',
      install: [
        'curl',
        'wget',
        { name: 'vim' }
      ]
    }], {
      skipUninstall: true,
      validateApply: () => {
        expect(() => execSync(TestUtils.getShellCommand('which curl'))).to.not.throw;
        expect(() => execSync(TestUtils.getShellCommand('which wget'))).to.not.throw;
        expect(() => execSync(TestUtils.getShellCommand('which vim'))).to.not.throw;
        expect(() => execSync(TestUtils.getShellCommand('which apt-get'))).to.not.throw;
      },
      testModify: {
        modifiedConfigs: [{
          type: 'apt',
          install: [
            'curl',
            'git',
            { name: 'htop' }
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
        // apt-get should still exist as it's a core system component
        expect(() => execSync(TestUtils.getShellCommand('which apt-get'))).to.not.throw;
      }
    });
  });

  it('Can install packages with specific versions', { timeout: 300000 }, async () => {
    if (!TestUtils.isLinux()) {
      console.log('Skipping apt test - not running on Linux');
      return;
    }

    // Get available version of a package
    const availableVersions = execSync('apt-cache madison curl | head -1 | awk \'{print $3}\'').toString().trim();

    await PluginTester.fullTest(pluginPath, [{
      type: 'apt',
      install: [
        { name: 'curl', version: availableVersions }
      ]
    }], {
      skipUninstall: true,
      validateApply: () => {
        expect(() => execSync(TestUtils.getShellCommand('which curl'))).to.not.throw;
        const installedVersion = execSync('dpkg-query -W -f=\'${Version}\' curl').toString().trim();
        expect(installedVersion).toBe(availableVersions);
      },
    });
  });

  it('Can skip apt-get update when update is false', { timeout: 300000 }, async () => {
    if (!TestUtils.isLinux()) {
      console.log('Skipping apt test - not running on Linux');
      return;
    }

    await PluginTester.fullTest(pluginPath, [{
      type: 'apt',
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
