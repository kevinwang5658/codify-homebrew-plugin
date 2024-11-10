import { afterEach, beforeEach, describe, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import path from 'node:path';

describe('Ssh key tests', () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can generate and delete an ssh key', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      {
        type: 'ssh-key',
        passphrase: '',
      }
    ])
  })

  it('Can generate and delete a custom key', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      {
        type: 'ssh-key',
        keyType: "rsa",
        bits: 3072,
        comment: 'person@email.com',
        fileName: 'custom_key_name',
        passphrase: 'password',
        folder: '~',
      }
    ])
  })

  afterEach(() => {
    plugin.kill();
  })

})
