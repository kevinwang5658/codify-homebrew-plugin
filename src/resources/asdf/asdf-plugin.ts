import { CreatePlan, DestroyPlan, Resource, ResourceSettings, SpawnStatus, } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';

import { codifySpawn } from '../../utils/codify-spawn.js';
import AsdfPluginSchema from './asdf-plugin-schema.json';
import { AsdfPluginVersionsParameter } from './version-parameter.js';

export interface AsdfPluginConfig extends ResourceConfig {
  plugin: string;
  gitUrl: string;
  versions: string[];
}

const PLUGIN_LIST_REGEX = /^([^ ]+) +([^ ]+)$/

export class AsdfPluginResource extends Resource<AsdfPluginConfig> {
  getSettings(): ResourceSettings<AsdfPluginConfig> {
    return {
      id: 'asdf-plugin',
      dependencies: ['asdf'],
      schema: AsdfPluginSchema,
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
      .map((l) => l.trim())
      .map((l) => l.replaceAll('*', ''))
      .map((l) => {
        console.log(l);
        const matches = l.match(PLUGIN_LIST_REGEX)
        if (!matches) {
          return null;
        }

        console.log(matches);

        const [original, name, gitUrl] = matches;
        return [name, gitUrl] as const;
      }).filter(Boolean)

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

