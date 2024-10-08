import { afterEach, beforeEach, describe, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';

describe('Afds tests', async () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can install asdf and plugins', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      {
        type: 'asdf',
        plugins: ['nodejs', 'ruby']
      },
      {
        type: 'asdf-plugin',
        plugin: 'nodejs',
        versions: ['latest', '18.20.4']
      }
    ]);
  })

  // it('Support plugins resource', { timeout: 300000 }, async () => {
  //   await plugin.fullTest([
  //     {
  //       type: 'asdf',
  //     },
  //     {
  //       type: 'asdf-plugin',
  //       plugin: 'nodejs',
  //       versions: ['latest']
  //     }
  //   ], false);
  // })
  //
  // it('Can install custom gitUrls', { timeout: 300000 }, async () => {
  //   await plugin.fullTest([
  //     {
  //       type: 'asdf',
  //     },
  //     {
  //       type: 'asdf-plugin',
  //       plugin: 'nodejs',
  //       gitUrl: 'https://github.com/cheetah/asdf-zig.git',
  //       versions: ['latest']
  //     }
  //   ], false);
  //
  //   await plugin.fullTest([
  //     {
  //       type: 'asdf',
  //     },
  //     {
  //       type: 'asdf-plugin',
  //       plugin: 'nodejs',
  //       gitUrl: 'https://github.com/asdf-vm/asdf-nodejs.git',
  //       versions: ['latest']
  //     }
  //   ]);
  // })

  afterEach(() => {
    plugin.kill();
  })
})
