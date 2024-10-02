import { describe, it, expect, beforeEach } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import path from 'node:path';

// Example test suite
describe('nvm tests', () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can install nvm and node',  { timeout: 500000 }, async () => {
    await plugin.fullTest([
      {
        type: 'nvm',
        global: '20',
        nodeVersions: ['20', '18']
      }
    ]);
  });
});

export {};
