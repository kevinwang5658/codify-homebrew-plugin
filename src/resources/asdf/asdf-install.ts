import { CreatePlan, DestroyPlan, getPty, Resource, ResourceSettings, untildify, } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import * as fs from 'node:fs/promises';
import path from 'node:path';

import { SpawnStatus, codifySpawn } from '../../utils/codify-spawn.js';
import { FileUtils } from '../../utils/file-utils.js';
import AsdfInstallSchema from './asdf-install-schema.json';
import { AsdfPluginVersionsParameter } from './version-parameter.js';

export interface AsdfInstallConfig extends ResourceConfig {
  plugin?: string;
  versions?: string[];
  directory?: string;
}

const CURRENT_VERSION_REGEX = /[^ ]+ +([^ ]+).*/;
const TOOL_VERSIONS_REGEX = /^([^ ]+) +([^ ]+)$/;


export class AsdfInstallResource extends Resource<AsdfInstallConfig> {
  getSettings(): ResourceSettings<AsdfInstallConfig> {
    return {
      id: 'asdf-install',
      dependencies: ['asdf'],
      schema: AsdfInstallSchema,
      parameterSettings: {
        directory: { type: 'directory' },
        versions: { type: 'array' }
      },
      importAndDestroy:{
        requiredParameters: ['directory'],
        refreshKeys: ['directory']
      },
    }
  }

  async validate(parameters: Partial<AsdfInstallConfig>): Promise<void> {
    if ((parameters.directory && parameters.versions) || (parameters.directory && parameters.plugin)) {
      throw new Error('Asdf directory install cannot be specified together with plugin and parameter');
    }

    if (!parameters.directory && !(parameters.versions && parameters.plugin)) {
      throw new Error('Both versions and plugin must be specified together');
    }

    if (parameters.directory && !(await FileUtils.checkDirExistsOrThrowIfFile(parameters.directory))) {
      throw new Error(`Directory ${parameters.local} does not exist`);
    }
  }

  async refresh(parameters: Partial<AsdfInstallConfig>): Promise<Partial<AsdfInstallConfig> | Partial<AsdfInstallConfig>[] | null> {
    const $ = getPty();

    if ((await $.spawnSafe('which asdf')).status === SpawnStatus.ERROR) {
      return null;
    }

    if (parameters.directory) {
      const desiredTools = await this.getToolVersions(parameters.directory);

      for (const { plugin, version } of desiredTools) {
        const { status, data } = await $.spawnSafe(`asdf current ${plugin}`, { cwd: parameters.directory });
        if (status === SpawnStatus.ERROR || data.trim() === '') {
          return null;
        }

        const [_, currentVersion] = data.match(CURRENT_VERSION_REGEX)!;
        if (currentVersion !== version) {
          return null;
        }
      }

      return {
        directory: parameters.directory,
      };
    }

    // Directly check plugin version
    const versionsQuery = await $.spawnSafe(`asdf list ${parameters.plugin}`);
    if (versionsQuery.status === SpawnStatus.ERROR || versionsQuery.data.trim() === 'No versions installed') {
      return null;
    }

    const latest = parameters.versions?.includes('latest')
      ? (await codifySpawn(`asdf latest ${parameters.plugin}`)).data.trim()
      : null;

    const versions = versionsQuery.data.split(/\n/)
      .map((l) => l.trim())
      .map((l) => l.replaceAll('*', ''))
      .map((l) => l.trim() === latest ? 'latest' : l)
      .filter(Boolean);

    return {
      plugin: parameters.plugin,
      versions,
    }
  }

  async create(plan: CreatePlan<AsdfInstallConfig>): Promise<void> {
    if (plan.desiredConfig.directory) {
      const desiredTools = await this.getToolVersions(plan.desiredConfig.directory);

      // Make sure all of the plugins are installed. If not installed, then install them
      for (const { plugin } of desiredTools) {
        if ((await codifySpawn(`asdf list ${plugin}`, { throws: false })).status === SpawnStatus.ERROR) {
          await codifySpawn(`asdf plugin add ${plugin}`);
        }
      }

      await codifySpawn('asdf install', { cwd: plan.desiredConfig.directory });
      return;
    }

    await codifySpawn(`asdf install ${plan.desiredConfig?.plugin} ${plan.desiredConfig.versions?.join(' ')}`);
  }

  async destroy(plan: DestroyPlan<AsdfInstallConfig>): Promise<void> {
    if (plan.currentConfig.directory) {
      const desiredTools = await this.getToolVersions(plan.currentConfig.directory);

      // Uninstall plugin versions listed in .tool-versions
      for (const { plugin, version } of desiredTools) {
        await codifySpawn(`asdf uninstall ${plugin} ${version}`);
      }

      return;
    }

    // Other path is uninstalled through the stateful parameter
    await codifySpawn(`asdf uninstall ${plan.currentConfig?.plugin} ${plan.currentConfig.versions?.join(' ')}`);
  }

  private async getToolVersions(directory: string): Promise<Array<{ plugin: string; version: string }>> {
    const toolsVersions = (await fs.readFile(path.join(directory, '.tool-versions'))).toString();

    return toolsVersions.split(/\n/)
      .filter(Boolean)
      .map((l) => {
        const matches = l.match(TOOL_VERSIONS_REGEX);
        if (!matches || matches.length < 3) {
          throw new Error(`Asdf resource: unable to parse improperly formatted ${directory}/.tool-versions file.\n ${toolsVersions}`)
        }

        return matches.slice(1, 3)
      })
      .map(([plugin, version, file]) => ({ plugin, version, file }));
  }
}
