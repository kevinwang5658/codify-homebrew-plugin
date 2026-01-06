import { describe, expect, it } from 'vitest'
import { PluginTester, testSpawn } from 'codify-plugin-test';
import * as path from 'node:path';
import { TestUtils } from '../test-utils.js';
import { SpawnStatus } from 'codify-plugin-lib';

// Currently need to figure out a way to test snap. It requires system ctl
describe('Snap resource integration tests', { skip: true }, () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can install and uninstall snap packages', { timeout: 300000 }, async () => {
    if (!TestUtils.isLinux()) {
      console.log('Skipping snap test - not running on Linux');
      return;
    }

    // Check if snap is available
    if ((await testSpawn('which snap')).status !== SpawnStatus.SUCCESS) {
      console.log('Skipping snap test - snap not available on this system');
      return;
    }

    // Plans correctly and detects that snap is available
    await PluginTester.fullTest(pluginPath, [{
      type: 'snap',
      install: [
        'hello-world',
        'curl',
      ]
    }], {
      skipUninstall: true,
      validateApply: async () => {
        const snapList = (await testSpawn('snap list')).data;
        expect(snapList).toContain('hello-world');
        expect(snapList).toContain('curl');
        expect(await testSpawn('which snap')).toMatchObject({ status: SpawnStatus.SUCCESS });
      },
      testModify: {
        modifiedConfigs: [{
          type: 'snap',
          install: [
            'hello-world',
            'jq',
          ],
        }],
        validateModify: async () => {
          const snapList = (await testSpawn('snap list')).data;
          expect(snapList).toContain('hello-world');
          expect(snapList).toContain('jq');
          // curl should be removed
          expect(snapList).not.toContain('curl');
        }
      },
      validateDestroy: async () => {
        // snap should still exist as it's a core system component
        expect(await testSpawn('which snap')).toMatchObject({ status: SpawnStatus.SUCCESS });
      }
    });
  });

  it('Can install packages with specific channels', { timeout: 300000 }, async () => {
    if (!TestUtils.isLinux()) {
      console.log('Skipping snap test - not running on Linux');
      return;
    }

    // Check if snap is available
    // if ((await testSpawn('which snap')).status !== SpawnStatus.SUCCESS) {
    //   console.log('Skipping snap test - snap not available on this system');
    //   return;
    // }

    await PluginTester.fullTest(pluginPath, [{
      type: 'snap',
      install: [
        { name: 'hello-world', channel: 'stable' }
      ]
    }], {
      skipUninstall: true,
      validateApply: async () => {
        const snapList = (await testSpawn('snap list')).data;
        expect(snapList).toContain('hello-world');
      },
    });
  });

  it('Can install classic snaps', { timeout: 300000 }, async () => {
    if (!TestUtils.isLinux()) {
      console.log('Skipping snap test - not running on Linux');
      return;
    }

    // Check if snap is available
    // if ((await testSpawn('which snap')).status !== SpawnStatus.SUCCESS) {
    //   console.log('Skipping snap test - snap not available on this system');
    //   return;
    // }

    await PluginTester.fullTest(pluginPath, [{
      type: 'snap',
      install: [
        { name: 'code', classic: true }
      ]
    }], {
      skipUninstall: true,
      validateApply: async () => {
        const snapList = (await testSpawn('snap list')).data;
        expect(snapList).toContain('code');
      },
    });
  });
});
