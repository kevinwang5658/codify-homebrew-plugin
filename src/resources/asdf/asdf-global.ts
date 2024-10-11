import { CreatePlan, DestroyPlan, Resource, ResourceSettings, } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import os from 'node:os';
import path from 'node:path';

import { SpawnStatus, codifySpawn } from '../../utils/codify-spawn.js';
import { FileUtils } from '../../utils/file-utils.js';
import AsdfGlobalSchema from './asdf-global-schema.json';

export interface AsdfGlobalConfig extends ResourceConfig {
  plugin: string;
  version: string;
}

export class AsdfGlobalResource extends Resource<AsdfGlobalConfig> {
  getSettings(): ResourceSettings<AsdfGlobalConfig> {
    return {
      id: 'asdf-global',
      dependencies: ['asdf', 'asdf-plugin'],
      schema: AsdfGlobalSchema,
    }
  }

  async refresh(parameters: Partial<AsdfGlobalConfig>): Promise<Partial<AsdfGlobalConfig> | Partial<AsdfGlobalConfig>[] | null> {
    if ((await codifySpawn('which asdf', { throws: false })).status === SpawnStatus.ERROR) {
      return null;
    }

    if ((await codifySpawn(`asdf list ${parameters.plugin}`, { throws: false })).status === SpawnStatus.ERROR) {
      return null;
    }

    // Only check for the installed version matches if it's not latest. The latest version could be out of date.
    const installedVersions = new Set((await codifySpawn(`asdf list ${parameters.plugin}`))
      .data
      .split(/\n/)
      .filter(Boolean)
      .map((l) => l.trim())
      .map((l) => l.replaceAll('*', '')))

    if (parameters.version !== 'latest') {
      if (!installedVersions.has(parameters.version ?? '')) {
        return null;
      }
    } else if (installedVersions.size === 0) {
      return null;
    }

    const { status } = await codifySpawn(`asdf current ${parameters.plugin}`, { throws: false, cwd: os.homedir() });
    return status === SpawnStatus.ERROR
      ? null
      : parameters;
  }

  async create(plan: CreatePlan<AsdfGlobalConfig>): Promise<void> {
    await codifySpawn(`asdf global ${plan.desiredConfig.plugin} ${plan.desiredConfig.version}`);
  }

  async destroy(plan: DestroyPlan<AsdfGlobalConfig>): Promise<void> {
    await FileUtils.removeLineFromFile(path.join(os.homedir(), '.tool-versions'), plan.currentConfig.plugin);
  }
}
