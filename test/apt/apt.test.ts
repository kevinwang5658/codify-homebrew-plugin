import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTester, testSpawn } from 'codify-plugin-test';
import * as path from 'node:path';
import { TestUtils } from '../test-utils.js';
import { SpawnStatus, Utils } from 'codify-plugin-lib';

describe('Apt resource integration tests', { skip: !Utils.isLinux() }, () => {
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
      validateApply: async () => {
        expect(await testSpawn('which curl')).toMatchObject({ status: SpawnStatus.SUCCESS });
        expect(await testSpawn('which wget')).toMatchObject({ status: SpawnStatus.SUCCESS });
        expect(await testSpawn('which vim')).toMatchObject({ status: SpawnStatus.SUCCESS });
        expect(await testSpawn('which apt-get')).toMatchObject({ status: SpawnStatus.SUCCESS });
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
        validateModify: async () => {
          expect(await testSpawn('which curl')).toMatchObject({ status: SpawnStatus.SUCCESS });
          expect(await testSpawn('which git')).toMatchObject({ status: SpawnStatus.SUCCESS });
          expect(await testSpawn('which htop')).toMatchObject({ status: SpawnStatus.SUCCESS });
          // wget and vim should be removed
          expect(await testSpawn('which wget')).toMatchObject({ status: SpawnStatus.ERROR });
          expect(await testSpawn('which vim')).toMatchObject({ status: SpawnStatus.ERROR });
        }
      },
      validateDestroy: async () => {
        // apt-get should still exist as it's a core system component
        expect(await testSpawn('which apt-get')).toMatchObject({ status: SpawnStatus.SUCCESS });
      }
    });
  });

  it('Can install packages with specific versions', { timeout: 300000 }, async () => {
    if (!TestUtils.isLinux()) {
      console.log('Skipping apt test - not running on Linux');
      return;
    }

    // Get available version of a package
    const { data: availableVersions } = await testSpawn('apt-cache madison curl | head -1 | awk \'{print $3}\'');

    await PluginTester.fullTest(pluginPath, [{
      type: 'apt',
      install: [
        { name: 'curl', version: availableVersions }
      ]
    }], {
      skipUninstall: true,
      validateApply: async () => {
        expect(await testSpawn('which curl')).toMatchObject({ status: SpawnStatus.SUCCESS });
        const { data: installedVersion } = await testSpawn('dpkg-query -W -f=\'${Version}\' curl');
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
      validateApply: async () => {
        expect(await testSpawn('which curl')).toMatchObject({ status: SpawnStatus.SUCCESS });
      },
    });
  });
});
