import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTester, testSpawn } from 'codify-plugin-test';
import * as path from 'node:path';
import { SpawnStatus } from 'codify-plugin-lib';

describe('Homebrew custom install integration tests', () => {
  const pluginPath = path.resolve('./src/index.ts');

  it ('Creates brew in a custom location', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [{
      type: 'homebrew',
      directory: '~/.homebrew',
      formulae: [
        'jenv',
      ],
    }], {
      validateApply: async () => {
        expect(await testSpawn('which jenv')).toMatchObject({ status: SpawnStatus.SUCCESS });
        expect(await testSpawn('which brew')).toMatchObject({ status: SpawnStatus.SUCCESS });
      }
    })
  })
})
