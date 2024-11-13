import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';

describe('Alias resource integration tests', async () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can add an alias to zshrc', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      {
        type: 'alias',
        alias: 'test',
        value: 'ls'
      }
    ]);
  })

  it('Validates against invalid alias', { timeout: 300000 }, async () => {
    expect(async () => plugin.fullTest([
      {
        type: 'alias',
        alias: 'test$$$',
        value: 'ls'
      }
    ], true)).rejects.toThrowError();
  })

  afterEach(() => {
    plugin.kill();
  })
})
