import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import * as cp from 'child_process'
import { PlanRequestDataSchema, PlanResponseDataSchema } from 'codify-schemas';
import { TestUtils } from '../test-utils.js';

describe('Asdf tests', async () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can install asdf and plugins', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      {
        type: 'asdf',
        plugins: ['nodejs', 'ruby']
      },
      {
        type: 'asdf-plugin',
        plugin: 'nodejs',
        versions: ['latest', '18.20.4']
      },
      {
        type: 'asdf-global',
        plugin: 'nodejs',
        version: 'latest',
      }
    ], {
      validateApply: async () => {
        expect(() => cp.execSync(TestUtils.getShellCommand('which asdf;'))).to.not.throw;
        expect(() => cp.execSync(TestUtils.getShellCommand('which node'))).to.not.throw;
      },
      validateDestroy: async () => {
        expect(() => cp.execSync(TestUtils.getShellCommand('which asdf;'))).to.throw;
        expect(() => cp.execSync(TestUtils.getShellCommand('which node'))).to.throw;
      }
    });
  })

  it('Support plugins resource', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      {
        type: 'asdf',
      },
      {
        type: 'asdf-plugin',
        plugin: 'nodejs',
        versions: ['latest']
      }
    ], {
      validateApply: async () => {
        expect(() => cp.execSync(TestUtils.getShellCommand('which asdf;'))).to.not.throw;
        expect(() => cp.execSync(TestUtils.getShellCommand('which node'))).to.not.throw;
      },
      validateDestroy: async () => {
        expect(() => cp.execSync(TestUtils.getShellCommand('which asdf;'))).to.throw;
        expect(() => cp.execSync(TestUtils.getShellCommand('which node'))).to.throw;
      }
    });
  })

  it('Can install custom gitUrls', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      {
        type: 'asdf',
      },
      {
        type: 'asdf-plugin',
        plugin: 'nodejs',
        gitUrl: 'https://github.com/cheetah/asdf-zig.git',
        versions: ['latest']
      }
    ], {
      skipUninstall: true,
    });

    await PluginTester.fullTest(pluginPath, [
      {
        type: 'asdf',
      },
      {
        type: 'asdf-plugin',
        plugin: 'nodejs',
        gitUrl: 'https://github.com/asdf-vm/asdf-nodejs.git',
        versions: ['latest']
      }
    ], {
      validateApply: async () => {
        expect(() => cp.execSync(TestUtils.getShellCommand('which zig;'))).to.not.throw;
        expect(() => cp.execSync(TestUtils.getShellCommand('which asdf;'))).to.not.throw;
        expect(() => cp.execSync(TestUtils.getShellCommand('which node'))).to.not.throw;
      },
      validateDestroy: async () => {
        expect(() => cp.execSync(TestUtils.getShellCommand('which zig;'))).to.throw;
        expect(() => cp.execSync(TestUtils.getShellCommand('which asdf;'))).to.throw;
        expect(() => cp.execSync(TestUtils.getShellCommand('which node'))).to.throw;
      }
    });
  })

  it('Can install a local version', { timeout: 300000 }, async () => {
    await fs.mkdir(path.join(os.homedir(), 'localDir'));

    await PluginTester.fullTest(pluginPath, [
      {
        type: 'asdf',
        plugins: ['nodejs'],
      },
      {
        type: 'asdf-plugin',
        plugin: 'nodejs',
        versions: ['20.18.0']
      },
      {
        type: 'asdf-local',
        plugin: 'nodejs',
        version: '20.18.0',
        directory: '~/localDir'
      }
    ]);
  })

  it('Can uninstall asdf-plugin-version separately from asdf-plugin', { timeout: 300000 }, async () => {
    // localDir1 is created in the previous test
    await fs.mkdir(path.join(os.homedir(), 'localDir2'));

    await PluginTester.fullTest(pluginPath, [
      {
        type: 'asdf',
        plugins: ['nodejs'],
      },
      {
        type: 'asdf-plugin',
        plugin: 'golang',
        versions: ['latest'],
      },
      {
        type: 'asdf-local',
        plugin: 'golang',
        version: 'latest',
        directories: ['~/localDir', '~/localDir2']
      }
    ], {
      skipUninstall: true,
    });

    await PluginTester.uninstall(pluginPath, [
      {
        type: 'asdf-local',
        plugin: 'golang',
        version: 'latest',
        directories: ['~/localDir', '~/localDir2']
      }
    ])
  })
})
