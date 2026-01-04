import { describe, expect, it } from 'vitest';
import { PluginTester, testSpawn } from 'codify-plugin-test';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { SpawnStatus } from 'codify-plugin-lib';

describe('Asdf install tests', async () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can install a .tool-versions file', { timeout: 300000 }, async () => {
    await fs.mkdir(path.join(os.homedir(), 'toolDir'));
    await fs.writeFile(
      path.join(os.homedir(), 'toolDir', '.tool-versions'),
      'nodejs 22.9.0\n' +
      'golang 1.23.2'
    )

    await PluginTester.fullTest(pluginPath, [
      {
        type: 'homebrew',
        os: ['macOS']
      },
      {
        type: 'asdf',
      },
      {
        type: 'asdf-install',
        directory: '~/toolDir',
      },
    ], {
      validateApply: async () => {
        expect(testSpawn('which asdf;')).resolves.toMatchObject({ status: SpawnStatus.SUCCESS })
        expect(testSpawn('which node')).resolves.toMatchObject({ status: SpawnStatus.SUCCESS });
        expect(testSpawn('which golang')).resolves.toMatchObject({ status: SpawnStatus.SUCCESS });

      },
      validateDestroy: async () => {
        expect(testSpawn('which asdf;')).resolves.toMatchObject({ status: SpawnStatus.ERROR });
        expect(testSpawn('which node')).resolves.toMatchObject({ status: SpawnStatus.ERROR });
        expect(testSpawn('which golang')).resolves.toMatchObject({ status: SpawnStatus.ERROR });
      }
    });
  })

  it('Can install a plugin and then a version', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      { type: 'homebrew', os: ['macOS'] },
      {
        type: 'asdf',
        plugins: ['nodejs']
      },
      {
        type: 'asdf-install',
        plugin: 'nodejs',
        versions: ['20.18.0']
      },
    ], {
      validateApply: async () => {
        expect(testSpawn('which asdf;')).resolves.toMatchObject({ status: SpawnStatus.SUCCESS });
        expect(testSpawn('which node')).resolves.toMatchObject({ status: SpawnStatus.SUCCESS });
      },
      validateDestroy: async () => {
        expect(testSpawn('which asdf;')).resolves.toMatchObject({ status: SpawnStatus.ERROR });
        expect(testSpawn('which node')).resolves.toMatchObject({ status: SpawnStatus.ERROR });
      }
    });
  })
})
