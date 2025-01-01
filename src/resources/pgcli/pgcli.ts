import { getPty, Resource, ResourceSettings, SpawnStatus } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';

import { codifySpawn } from '../../utils/codify-spawn.js';
import Schema from './pgcli-schema.json';

export interface PgcliConfig extends ResourceConfig {}

export class PgcliResource extends Resource<PgcliConfig> {
  getSettings(): ResourceSettings<PgcliConfig> {
    return {
      id: 'pgcli',
      schema: Schema,
      dependencies: ['homebrew'],
    }
  }

  override async refresh(): Promise<Partial<PgcliConfig> | null> {
    const $ = getPty();

    const result = await $.spawnSafe('which pgcli');
    if (result.status === SpawnStatus.ERROR) {
      return null;
    }

    return {}
  }

  override async create(): Promise<void> {
    const isBrewInstalled = await this.isBrewInstalled();
    if (isBrewInstalled) {
      await codifySpawn('brew install pgcli');
      return;
    }

    // Although the instructions for installing pgcli allow it to be installed using pip, it
    // will still require homebrew on the system since postgresql needs to be installed
    // as a dependency.
    // TODO: Add the ability to choose a pip install in the future.

    throw new Error(`Unable to install pgcli because homebrew is not installed on the system.
    
Brew can be installed using Codify:
{
  "type": "homebrew",
}
    `)
  }

  override async destroy(): Promise<void> {
    const isBrewInstalled = await this.isBrewInstalled();
    if (!isBrewInstalled) {
      console.log('Unable to uninstall pgcli because homebrew is not installed');
      return;
    }

    await codifySpawn('brew uninstall pgcli');
  }

  private async isBrewInstalled(): Promise<boolean> {
    const brewCheck = await codifySpawn('which brew', { throws: false });
    return brewCheck.status === SpawnStatus.SUCCESS;
  }
}
