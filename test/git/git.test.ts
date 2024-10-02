import { afterEach, beforeEach, describe, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';

describe('Git integration tests', async () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can add global user name and email', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      {
        type: 'git',
        username: 'test',
        email: 'test@test.com'
      }
    ], true);
  })

  it('Can modify git user name and email', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      {
        type: 'git',
        username: 'test2',
        email: 'test2@test.com'
      }
    ], true); // Set true here because git resource cannot be destroyed right now
  })

  afterEach(() => {
    plugin.kill();
  })
})
