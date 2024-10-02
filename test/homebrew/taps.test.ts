import { afterEach, beforeEach, describe, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';

describe('Homebrew taps tests', () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can install homebrew and add a tap', { timeout: 300000 }, async () => {
    // Plans correctly and detects that brew is not installed
    await plugin.fullTest([{
      type: 'homebrew',
      taps: ['cirruslabs/cli'],
    }], true);
  });

  it ('Can install additional taps', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: 'homebrew',
      taps: ['cirruslabs/cli', 'hashicorp/tap'],
    }])
  })

  afterEach(() => {
    plugin.kill();
  })
})
