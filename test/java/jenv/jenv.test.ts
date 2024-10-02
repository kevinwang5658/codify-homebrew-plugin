import { afterEach, beforeEach, describe, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';

describe('Jenv resource integration tests', () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Installs jenv and java with homebrew', { timeout: 500000 }, async () => {
    await plugin.fullTest([
      { type: 'homebrew' },
      {
        type: 'jenv',
        global: '17',
        add: ['17']
      }
    ], true);
  });

  it ('Can install additional java versions', { timeout: 500000 }, async () => {
    await plugin.fullTest([
      { type: 'homebrew' },
      {
        type: 'jenv',
        global: '21',
        add: ['17', '21']
      }
    ])
  })

  afterEach(() => {
    plugin.kill();
  })
})
