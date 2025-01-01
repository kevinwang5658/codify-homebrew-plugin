import { describe, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';

const pluginPath = path.resolve('./src/index.ts');

describe('XCode tools install tests', async () => {
  it('Can uninstall xcode tools', { timeout: 300000 }, async () => {
    await PluginTester.uninstall(pluginPath, [{
      type: 'xcode-tools'
    }])
  })
  
  it('Can install xcode tools', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [{
      type: 'xcode-tools',
    }]);
  })
})
