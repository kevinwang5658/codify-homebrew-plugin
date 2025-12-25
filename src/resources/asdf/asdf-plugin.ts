import { CreatePlan, DestroyPlan, getPty, Resource, ResourceSettings, SpawnStatus, untildify } from 'codify-plugin-lib';
import { OS, ResourceConfig } from 'codify-schemas';

import { codifySpawn } from '../../utils/codify-spawn.js';
import AsdfPluginSchema from './asdf-plugin-schema.json';
import { AsdfPluginVersionsParameter } from './version-parameter.js';

export interface AsdfPluginConfig extends ResourceConfig {
  plugin: string;
  gitUrl: string;
  versions: string[];
}

const PLUGIN_LIST_REGEX = /^([^ ]+?)\s+([^ ]+)/

export class AsdfPluginResource extends Resource<AsdfPluginConfig> {
  getSettings(): ResourceSettings<AsdfPluginConfig> {
    return {
      id: 'asdf-plugin',
      operatingSystems: [OS.Darwin, OS.Linux],
      dependencies: ['asdf'],
      schema: AsdfPluginSchema,
      parameterSettings: {
        versions: { type: 'stateful', definition: new AsdfPluginVersionsParameter() }
      },
    }
  }

  async refresh(parameters: Partial<AsdfPluginConfig>): Promise<Partial<AsdfPluginConfig> | Partial<AsdfPluginConfig>[] | null> {
    const $ = getPty();
    if ((await $.spawnSafe('which asdf')).status === SpawnStatus.ERROR) {
      return null;
    }

    const installedVersions = (await $.spawn('asdf plugin list --urls'))
      .data
      .split(/\n/)
      .filter(Boolean)
      .map((l) => {
        console.log('line', l);
        const matches = l.match(PLUGIN_LIST_REGEX)
        console.log('matches', matches);

        if (!matches) {
          return null;
        }

        const [original, name, gitUrl] = matches;
        return [name, gitUrl] as const;
      }).filter(Boolean)
      .map((l) => l!);


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
    const $ = getPty();
    await $.spawn(`asdf plugin add ${plan.desiredConfig.plugin} ${plan.desiredConfig.gitUrl ?? ''}`, { interactive: true });
  }

  async destroy(plan: DestroyPlan<AsdfPluginConfig>): Promise<void> {
    const $ = getPty();
    await $.spawn(`asdf plugin remove ${plan.currentConfig.plugin} ${plan.currentConfig.gitUrl ?? ''}`, { interactive: true });
  }
}

