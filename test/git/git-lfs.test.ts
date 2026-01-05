import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester, testSpawn } from 'codify-plugin-test';
import * as path from 'node:path';
import { TestUtils } from '../test-utils.js';
import { SpawnStatus } from 'codify-plugin-lib';

describe('Git lfs integration tests', async () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can install git-lfs', { timeout: 500000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      { type: 'git-lfs' }
    ], {
      validateApply: async () => {
        const env = await testSpawn('git lfs env;');
        const envLines = env.data.split(/\n/);

        expect(envLines.at(-2)).to.contain('git config filter.lfs.smudge');
        expect(envLines.at(-1)).to.contain('git config filter.lfs.clean');
      },
      validateDestroy: async () => {
        expect(await testSpawn('which git lfs')).toMatchObject({ status: SpawnStatus.ERROR });
      }
    });
  })
})
