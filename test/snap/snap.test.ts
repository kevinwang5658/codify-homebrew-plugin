import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';
import { TestUtils } from '../test-utils.js';

// Currently need to figure out a way to test snap. It requires system ctl
describe('Snap resource integration tests', { skip: true }, () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can install and uninstall snap packages', { timeout: 300000 }, async () => {
    if (!TestUtils.isLinux()) {
      console.log('Skipping snap test - not running on Linux');
      return;
    }

    // Check if snap is available
    // try {
    //   execSync('which snap');
    // } catch {
    //   console.log('Skipping snap test - snap not available on this system');
    //   return;
    // }

    // Plans correctly and detects that snap is available
    await PluginTester.fullTest(pluginPath, [{
      type: 'snap',
      install: [
        'hello-world',
        'curl',
      ]
    }], {
      skipUninstall: true,
      validateApply: () => {
        const snapList = execSync('snap list').toString();
        expect(snapList).toContain('hello-world');
        expect(snapList).toContain('curl');
        expect(() => execSync(TestUtils.getShellCommand('which snap'))).to.not.throw;
      },
      testModify: {
        modifiedConfigs: [{
          type: 'snap',
          install: [
            'hello-world',
            'jq',
          ],
        }],
        validateModify: () => {
          const snapList = execSync('snap list').toString();
          expect(snapList).toContain('hello-world');
          expect(snapList).toContain('jq');
          // curl should be removed
          expect(snapList).not.toContain('curl');
        }
      },
      validateDestroy: () => {
        // snap should still exist as it's a core system component
        expect(() => execSync(TestUtils.getShellCommand('which snap'))).to.not.throw;
      }
    });
  });

  it('Can install packages with specific channels', { timeout: 300000 }, async () => {
    if (!TestUtils.isLinux()) {
      console.log('Skipping snap test - not running on Linux');
      return;
    }

    // Check if snap is available
    // try {
    //   execSync('which snap');
    // } catch {
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
      validateApply: () => {
        const snapList = execSync('snap list').toString();
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
    // try {
    //   execSync('which snap');
    // } catch {
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
      validateApply: () => {
        const snapList = execSync('snap list').toString();
        expect(snapList).toContain('code');
      },
    });
  });
});
