import { afterEach, beforeEach, describe, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';

describe('Pyenv resource integration tests', () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Installs pyenv and python (this installs on a clean system without readline, openSSL, etc.)', { timeout: 500000 }, async () => {
    await plugin.fullTest([
      {
        type: 'pyenv',
        pythonVersions: ['3.11']
      }
    ], true);
  });

  it ('Can install additional python versions. (this installs after openSSL and readline have been installed)', { timeout: 700000 }, async () => {
    await plugin.fullTest([
      {
        type: 'homebrew',
        formulae: ['readline', 'openssl@3']
      },
      {
        type: 'pyenv',
        pythonVersions: ['3.11', '3.12', '2.7'],
        global: '3.12',
      }
    ])
  })

  afterEach(() => {
    plugin.kill();
  })
})
