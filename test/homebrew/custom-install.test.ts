import { afterEach, beforeEach, describe, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';

describe('Homebrew custom install integration tests', () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it ('Creates brew in a custom location', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: 'homebrew',
      directory: '~/.homebrew',
      formulae: [
        'jenv',
      ],
    }])
  })

  it ('Can uninstall brew', { timeout: 300000 }, async () => {
    await plugin.uninstall([{
      type: 'homebrew',
      directory: '~/.homebrew',
      formulae: [
        'jenv',
      ],
    }]);
  })

  afterEach(() => {
    plugin.kill();
  })
})
