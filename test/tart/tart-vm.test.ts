import { describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import * as cp from 'child_process';
import { TestUtils } from '../test-utils.js';

describe('Tart VM tests', async () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can create a tart VM with memory and CPU settings', { timeout: 1200000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      { type: 'homebrew', os: ['macOS'] },
      {
        type: 'tart',
      },
      {
        type: 'tart-vm',
        sourceName: 'ghcr.io/cirruslabs/macos-sonoma-base:latest',
        localName: 'test-vm-resources',
        memory: 8192,
        cpu: 4,
      }
    ], {
      validateApply: async () => {
        expect(() => cp.execSync(TestUtils.getShellCommand('which tart'))).not.toThrow();
        // Check if the VM was created
        const vms = cp.execSync(TestUtils.getShellCommand('tart list')).toString().trim();
        expect(vms).toContain('test-vm-resources');

        // Check VM configuration
        const vmInfo = cp.execSync(TestUtils.getShellCommand('tart get test-vm-resources')).toString();
        expect(vmInfo).toContain('memory:');
        expect(vmInfo).toContain('cpu:');
      },
      testModify: {
        modifiedConfigs: [{
          type: 'tart-vm',
          sourceName: 'ghcr.io/cirruslabs/macos-sonoma-base:latest',
          name: 'test-vm-resources',
          memory: 8192,
          cpu: 4,
        }]
      },
      validateDestroy: async () => {
        // VM should be deleted
        const vms = cp.execSync(TestUtils.getShellCommand('tart list')).toString().trim();
        expect(vms).not.toContain('test-vm-resources');
      }
    });
  });
});
