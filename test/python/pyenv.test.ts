import { afterEach, beforeEach, describe, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';

describe('Pyenv resource integration tests', () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Installs pyenv and python', { timeout: 500000 }, async () => {
    await plugin.fullTest([{
      type: 'pyenv',
      pythonVersions: ['3.11']
    }], true);
  });

  it ('Can install additional python versions', { timeout: 500000 }, async () => {
    await plugin.fullTest([{
      type: 'pyenv',
      pythonVersions: ['3.11', '3.12'],
      global: '3.12',
    }])
  })

  afterEach(() => {
    plugin.kill();
  })
})
