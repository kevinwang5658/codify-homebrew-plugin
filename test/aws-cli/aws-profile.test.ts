import { afterEach, beforeEach, describe, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';

describe('Aws profile tests', async () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can add a aws-cli profile', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      { type: 'homebrew' },
      { type: 'aws-cli' },
      {
        type: 'aws-profile',
        awsAccessKeyId: 'keyId',
        awsSecretAccessKey: 'secretAccessKey',
        region: 'us-west-2',
        output: 'json'
      }
    ]);
  })

  it('Can add custom profiles', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: 'aws-profile',
      profile: 'codify',
      awsAccessKeyId: 'keyId',
      awsSecretAccessKey: 'secretAccessKey',
    }]);
  })

  it ('Can uninstall aws-cli', { timeout: 300000 }, async () => {
    await plugin.uninstall([
      { type: 'aws-cli' },
      { type: 'homebrew' },
    ]);
  })


  afterEach(() => {
    plugin.kill();
  })
})
