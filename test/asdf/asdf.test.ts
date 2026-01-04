import { describe, expect, it } from 'vitest';
import { PluginTester, testSpawn } from 'codify-plugin-test';
import * as path from 'node:path';
import * as cp from 'child_process'
import { TestUtils } from '../test-utils.js';
import { SpawnStatus } from 'codify-plugin-lib';

describe('Asdf tests', async () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can install asdf and plugins', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      { type: 'homebrew', os: ['macOS'] },
      {
        type: 'asdf',
        plugins: ['nodejs', 'ruby']
      },
      {
        type: 'asdf-plugin',
        plugin: 'nodejs',
        versions: ['latest', '18.20.4']
      }
    ], {
      validateApply: async () => {
        expect(await testSpawn('which asdf')).toMatchObject({ status: SpawnStatus.SUCCESS });
        expect(await testSpawn('which node')).toMatchObject({ status: SpawnStatus.SUCCESS });
      },
      validateDestroy: async () => {
        expect(await testSpawn('which asdf')).toMatchObject({ status: SpawnStatus.ERROR });
        expect(await testSpawn('which node')).toMatchObject({ status: SpawnStatus.ERROR });
      }
    });
  })

  it('Support plugins resource', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      { type: 'homebrew', os: ['macOS'] },
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
        expect(await testSpawn('which asdf;')).toMatchObject({ status: SpawnStatus.SUCCESS });
        expect(await testSpawn('which node')).toMatchObject({ status: SpawnStatus.SUCCESS });
      },
      validateDestroy: async () => {
        expect(await testSpawn('which asdf;')).toMatchObject({ status: SpawnStatus.ERROR });
        expect(await testSpawn('which node')).toMatchObject({ status: SpawnStatus.ERROR });
      }
    });
  })

  it('Can install custom gitUrls', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      { type: 'homebrew', os: ['macOS'] },
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
      { type: 'homebrew', os: ['macOS'] },
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
        expect(await testSpawn('which zig')).toMatchObject({ status: SpawnStatus.SUCCESS });
        expect(await testSpawn('which asdf')).toMatchObject({ status: SpawnStatus.SUCCESS });
        expect(await testSpawn('which node')).toMatchObject({ status: SpawnStatus.SUCCESS });
      },
      validateDestroy: async () => {
        expect(await testSpawn('which zig')).toMatchObject({ status: SpawnStatus.ERROR });
        expect(await testSpawn('which asdf')).toMatchObject({ status: SpawnStatus.ERROR });
        expect(await testSpawn('which node')).toMatchObject({ status: SpawnStatus.ERROR });
      }
    });
  })
})
