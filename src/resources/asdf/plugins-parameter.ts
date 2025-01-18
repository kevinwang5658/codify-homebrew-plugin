import { ArrayStatefulParameter, getPty, Plan, StatefulParameter } from 'codify-plugin-lib';

import { codifySpawn, SpawnStatus } from '../../utils/codify-spawn.js';
import { AsdfConfig } from './asdf.js';

export class AsdfPluginsParameter extends ArrayStatefulParameter<AsdfConfig, string> {
  async refresh(desired: null | string[]): Promise<null | string[]> {
    const $ = getPty();

    const plugins = await $.spawnSafe('asdf plugin list ')
    if (plugins.status === SpawnStatus.ERROR) {
      return null;
    }

    return plugins
      .data
      .split(/\n/)
      .filter(Boolean);
  }

  async addItem(item: string, plan: Plan<AsdfConfig>): Promise<void> {
    await codifySpawn(`asdf plugin add ${item}`);
  }

  async removeItem(item: string, plan: Plan<AsdfConfig>): Promise<void> {
    await codifySpawn(`asdf plugin remove ${item}`);
  }
}
