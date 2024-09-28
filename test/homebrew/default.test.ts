import { afterEach, beforeEach, describe, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';

describe('Homebrew main resource integration tests', () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Creates brew', { timeout: 300000 }, async () => {
    // Plans correctly and detects that brew is not installed
    await plugin.fullTest([{
      type: 'homebrew',
      formulae: [
        'glib',
        'gettext'
      ]
    }], true);
  });

  it ('Can install additional casks and formulas', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: 'homebrew',
      formulae: [
        'glib',
        'gettext',
        'jenv',
      ],
    }], true)
  })

  it ('Can handle fully qualified formula names (tap + formula)', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: 'homebrew',
      formulae: [
        'cirruslabs/cli/cirrus',
      ],
    }])
  })

  it ('Can uninstall brew', { timeout: 30000 }, async () => {
    await plugin.uninstall([{
      type: 'homebrew',
    }])
  })

  afterEach(() => {
    plugin.kill();
  })
})
