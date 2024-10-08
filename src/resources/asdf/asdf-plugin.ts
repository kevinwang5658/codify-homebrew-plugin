import {
  ArrayStatefulParameter, CreatePlan, DestroyPlan, Plan, Resource,
  ResourceSettings, SpawnStatus,
} from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';

import { codifySpawn } from '../../utils/codify-spawn.js';
import AsdfInstallSchema from './asdf-plugin-schema.json';

export interface AsdfPluginConfig extends ResourceConfig {
  plugin: string;
  gitUrl: string;
  versions: string[];
}

const PLUGIN_LIST_REGEX = /^([^ ]*) +([^ ]*)$/

export class AsdfPluginResource extends Resource<AsdfPluginConfig> {
  getSettings(): ResourceSettings<AsdfPluginConfig> {
    return {
      id: 'asdf-plugin',
      dependencies: ['asdf'],
      schema: AsdfInstallSchema,
      parameterSettings: {
        versions: { type: 'stateful', definition: new AsdfPluginVersionsParameter() }
      },
    }
  }

  async refresh(parameters: Partial<AsdfPluginConfig>): Promise<Partial<AsdfPluginConfig> | Partial<AsdfPluginConfig>[] | null> {
    if ((await codifySpawn('which asdf', { throws: false })).status === SpawnStatus.ERROR) {
      return null;
    }

    const installedVersions = (await codifySpawn('asdf plugin list --urls'))
      .data
      .split(/\n/)
      .filter(Boolean)
      .map((l) => {
        const matches = l.match(PLUGIN_LIST_REGEX)
        console.log(matches)

        if (!matches) {
          throw new Error(`Unable to parse asdf plugin name and gitUrl from: "${l}" using regex ${PLUGIN_LIST_REGEX}`)
        }

        const [original, name, gitUrl] = matches;
        return [name, gitUrl] as const;
      })

    const installedPlugin = installedVersions.find(([name]) => name === parameters.plugin);
    if (!installedPlugin) {
      return null;
    }

    return {
      plugin: parameters.plugin,
      gitUrl: installedPlugin[1],
    };
  }

  async create(plan: CreatePlan<AsdfPluginConfig>): Promise<void> {
    await codifySpawn(`asdf plugin add ${plan.desiredConfig.plugin} ${plan.desiredConfig.gitUrl ?? ''}`);
  }

  async destroy(plan: DestroyPlan<AsdfPluginConfig>): Promise<void> {
    await codifySpawn(`asdf plugin remove ${plan.currentConfig.plugin} ${plan.currentConfig.gitUrl ?? ''}`)
  }
}

export class AsdfPluginVersionsParameter extends ArrayStatefulParameter<AsdfPluginConfig, string> {

  async refresh(desired: null | string[], config: Partial<AsdfPluginConfig>): Promise<null | string[]> {
    const { data: versions } = await codifySpawn(`asdf list ${config.plugin}`);

    const latest = desired?.includes('latest')
      ? (await codifySpawn(`asdf latest ${config.plugin}`)).data
      : null;

    return versions.split(/\n/)
      .map((l) => l.trim())
      .map((l) => l.trim() === latest?.trim() ? 'latest' : l)
      .filter(Boolean);
  }
  
  async addItem(item: string, plan: Plan<AsdfPluginConfig>): Promise<void> {
    await codifySpawn(`asdf install ${plan.desiredConfig?.plugin} ${item}`);
  }
  
  async removeItem(item: string, plan: Plan<AsdfPluginConfig>): Promise<void> {
    await codifySpawn(`asdf install ${plan.desiredConfig?.plugin} ${item}`);
  }

}

