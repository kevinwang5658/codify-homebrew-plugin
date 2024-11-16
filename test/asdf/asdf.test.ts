import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import { PlanRequestDataSchema, PlanResponseDataSchema } from 'codify-schemas';

describe('Asdf tests', async () => {
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
      },
      {
        type: 'asdf-global',
        plugin: 'nodejs',
        version: 'latest',
      }
    ]);
  })

  it('Support plugins resource', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      {
        type: 'asdf',
      },
      {
        type: 'asdf-plugin',
        plugin: 'nodejs',
        versions: ['latest']
      }
    ]);
  })

  it('Can install custom gitUrls', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      {
        type: 'asdf',
      },
      {
        type: 'asdf-plugin',
        plugin: 'nodejs',
        gitUrl: 'https://github.com/cheetah/asdf-zig.git',
        versions: ['latest']
      }
    ], {
      skipUninstall: true,
    });

    await plugin.fullTest([
      {
        type: 'asdf',
      },
      {
        type: 'asdf-plugin',
        plugin: 'nodejs',
        gitUrl: 'https://github.com/asdf-vm/asdf-nodejs.git',
        versions: ['latest']
      }
    ]);
  })

  it('Can install a local version', { timeout: 300000 }, async () => {
    await fs.mkdir(path.join(os.homedir(), 'localDir'));

    await plugin.fullTest([
      {
        type: 'asdf',
        plugins: ['nodejs'],
      },
      {
        type: 'asdf-plugin',
        plugin: 'nodejs',
        versions: ['20.18.0']
      },
      {
        type: 'asdf-local',
        plugin: 'nodejs',
        version: '20.18.0',
        directory: '~/localDir'
      }
    ]);
  })

  it('Can uninstall asdf-plugin-version separately from asdf-plugin', { timeout: 300000 }, async () => {
    // localDir1 is created in the previous test
    await fs.mkdir(path.join(os.homedir(), 'localDir2'));

    await plugin.fullTest([
      {
        type: 'asdf',
        plugins: ['nodejs'],
      },
      {
        type: 'asdf-plugin',
        plugin: 'golang',
        versions: ['latest'],
      },
      {
        type: 'asdf-local',
        plugin: 'golang',
        version: 'latest',
        directories: ['~/localDir', '~/localDir2']
      }
    ], {
      skipUninstall: true,
    });

    await plugin.uninstall([
      {
        type: 'asdf-local',
        plugin: 'golang',
        version: 'latest',
        directories: ['~/localDir', '~/localDir2']
      }
    ])

    const plan = await plugin.plan({
      desired: {
        type: 'asdf-plugin',
        plugin: 'golang',
        versions: ['latest'],
      },
      state: undefined,
      isStateful: false
    });

    expect(plan).toMatchObject({
      resourceType: 'asdf-plugin',
      operation: 'noop'
    })
  })

  afterEach(() => {
    plugin.kill();
  })
})
