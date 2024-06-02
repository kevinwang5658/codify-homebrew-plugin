import { beforeEach, describe, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';

describe('Test aws-cli', async () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can install aws-cli', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      { type: 'homebrew' },
      { type: 'aws-cli' },
    ])
  })
  
  it('Can un-install aws-cli', { timeout: 300000 }, async () => {
    await plugin.uninstall([
      { type: 'aws-cli' },
      { type: 'homebrew' },
    ])
  })
})
