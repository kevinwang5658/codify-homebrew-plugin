import { afterEach, beforeEach, describe, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';

describe('Android studios tests', async () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can install the latest Android studios', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      { type: 'android-studio' }
    ]);
  })

  afterEach(() => {
    plugin.kill();
  })
})
