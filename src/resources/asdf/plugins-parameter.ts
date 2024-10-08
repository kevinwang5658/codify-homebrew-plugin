import { ArrayStatefulParameter, Plan, StatefulParameter } from 'codify-plugin-lib';

import { codifySpawn } from '../../utils/codify-spawn.js';
import { AsdfConfig } from './asdf.js';

export class AsdfPluginsParameter extends ArrayStatefulParameter<AsdfConfig, string> {
  async refresh(desired: null | string[]): Promise<null | string[]> {
    const { data: plugins } = await codifySpawn('asdf plugin list ')

    return plugins
      .split(/\n/);
  }

  async addItem(item: string, plan: Plan<AsdfConfig>): Promise<void> {
    await codifySpawn(`asdf plugin add ${item}`);
  }

  async removeItem(item: string, plan: Plan<AsdfConfig>): Promise<void> {
    await codifySpawn(`asdf plugin remove ${item}`);
  }
}
