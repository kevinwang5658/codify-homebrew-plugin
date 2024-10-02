import { afterEach, beforeEach, describe, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';

describe('Vscode integration tests', async () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can install vscode', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: 'vscode',
      directory: '/Applications'
    }]);
  })
  
  afterEach(() => {
    plugin.kill();
  })
})
