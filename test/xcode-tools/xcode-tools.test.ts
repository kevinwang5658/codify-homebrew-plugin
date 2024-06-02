import { afterEach, beforeEach, describe, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';

describe('XCode tools install tests', async () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can uninstall xcode tools', { timeout: 300000 }, async () => {
    await plugin.uninstall([{
      type: 'xcode-tools'
    }])
  })
  
  it('Can install xcode tools', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: 'xcode-tools',
    }]);
  })

  afterEach(() => {
    plugin.kill();
  })
})
