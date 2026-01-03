import { describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import * as cp from 'child_process';
import { TestUtils } from '../test-utils.js';

describe('Tart tests', async () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can install tart', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      { type: 'homebrew', os: ['macOS'] },
      {
        type: 'tart',
      }
    ], {
      validateApply: async () => {
        expect(() => cp.execSync(TestUtils.getShellCommand('which tart'))).not.toThrow();
      },
      validateDestroy: async () => {
        expect(() => cp.execSync(TestUtils.getShellCommand('which tart'))).toThrow();
      }
    });
  });

  it('Can install tart with custom TART_HOME', { timeout: 300000 }, async () => {
    const customTartHome = path.join(process.env.HOME || '', '.tart-custom');

    await PluginTester.fullTest(pluginPath, [
      { type: 'homebrew', os: ['macOS'] },
      {
        type: 'tart',
        tartHome: customTartHome,
      }
    ], {
      validateApply: async () => {
        expect(() => cp.execSync(TestUtils.getShellCommand('which tart'))).not.to.throw();
        // Check if TART_HOME is set in shell
        const tartHome = cp.execSync(TestUtils.getShellCommand('echo $TART_HOME')).toString().trim();
        expect(tartHome).toBe(customTartHome);
      },
      validateDestroy: async () => {
        expect(() => cp.execSync(TestUtils.getShellCommand('which tart'))).toThrow();
      }
    });
  });

  // Normally skip this test because the 30gb download can take a long time
  it('Can clone a VM', { timeout: 1000000, skip: true }, async () => {
    await PluginTester.fullTest(pluginPath, [
      { type: 'homebrew', os: ['macOS'] },
      {
        type: 'tart',
        clone: [{ sourceName: 'ghcr.io/cirruslabs/macos-sonoma-base:latest', name: 'my-custom-vm' }],
      }
    ], {
      validateApply: async () => {
        expect(() => cp.execSync(TestUtils.getShellCommand('which tart'))).not.toThrow();
        // Check if the VM was cloned
        const vms = cp.execSync(TestUtils.getShellCommand('tart list')).toString().trim();
        expect(vms).toContain('my-custom-vm');
      },
      validateDestroy: async () => {
        expect(() => cp.execSync(TestUtils.getShellCommand('which tart'))).toThrow();
      }
    });
  });
});
