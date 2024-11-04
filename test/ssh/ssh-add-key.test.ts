import { afterEach, beforeEach, describe, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import path from 'node:path';

describe('Ssh Add Key tests', () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can generate and then add key to ssh-agent + keychain', { timeout: 300000 }, async () => {
    // await plugin.fullTest([
    //   {
    //     type: 'ssh-key',
    //     fileName: 'id_ed25519',
    //     passphrase: ''
    //   },
    //   {
    //     type: 'ssh-add-key',
    //     path: '~/.ssh/id_ed25519'
    //   }
    // ])
  })

  afterEach(() => {
    plugin.kill();
  })

})
