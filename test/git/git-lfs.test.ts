import { afterEach, beforeEach, describe, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';

describe('Git lfs integration tests', async () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can install git-lfs', { timeout: 500000 }, async () => {
    await plugin.fullTest([
      { type: 'homebrew' },
      { type: 'git-lfs' }
    ]);
  })

  afterEach(() => {
    plugin.kill();
  })
})
