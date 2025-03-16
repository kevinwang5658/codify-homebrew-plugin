import { describe, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import path from 'node:path';

describe('Virtualenv tests', () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can install and uninstall virtualenv', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      { type: 'homebrew' },
      { type: 'virtualenv' }
    ])
  })
})
