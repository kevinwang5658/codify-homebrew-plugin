import { ArrayStatefulParameter, Plan } from 'codify-plugin-lib';

import { codifySpawn } from '../../utils/codify-spawn.js';
import { AsdfPluginConfig } from './asdf-plugin.js';

export class AsdfPluginVersionsParameter extends ArrayStatefulParameter<AsdfPluginConfig, string> {

  async refresh(desired: null | string[], config: Partial<AsdfPluginConfig>): Promise<null | string[]> {
    const { data: versions } = await codifySpawn(`asdf list ${config.plugin}`);

    const latest = desired?.includes('latest')
      ? (await codifySpawn(`asdf latest ${config.plugin}`)).data.trim()
      : null;

    return versions.split(/\n/)
      .map((l) => l.trim())
      .map((l) => l.replaceAll('*', ''))
      .map((l) => l.trim() === latest ? 'latest' : l)
      .filter(Boolean);
  }

  async addItem(item: string, plan: Plan<AsdfPluginConfig>): Promise<void> {
    await codifySpawn(`asdf install ${plan.desiredConfig?.plugin} ${item}`);
  }

  async removeItem(item: string, plan: Plan<AsdfPluginConfig>): Promise<void> {
    await codifySpawn(`asdf install ${plan.desiredConfig?.plugin} ${item}`);
  }

}
