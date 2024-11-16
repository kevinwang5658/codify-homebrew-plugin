import { afterEach, beforeEach, describe, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';

describe('Git clone integration tests', async () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can install git repo to parent dir', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      {
        type: 'git-clone',
        parentDirectory: '~/projects/test',
        repository: 'https://github.com/kevinwang5658/codify-homebrew-plugin.git'
      }
    ], {
      skipUninstall: true,
    });
  })

  it('Can install git repo to specified dir', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      {
        type: 'git-clone',
        directory: '~/projects/nested/codify-plugin',
        repository: 'https://github.com/kevinwang5658/codify-homebrew-plugin.git'
      }
    ], {
      skipUninstall: true,
    });
  })

  afterEach(() => {
    plugin.kill();
  })
})
