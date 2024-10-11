import { CreatePlan, DestroyPlan, Resource, ResourceSettings, untildify, } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import * as fs from 'node:fs/promises';
import path from 'node:path';

import { SpawnStatus, codifySpawn } from '../../utils/codify-spawn.js';
import AsdfInstallSchema from './asdf-install-schema.json';
import { AsdfPluginVersionsParameter } from './version-parameter.js';
import { FileUtils } from '../../utils/file-utils.js';

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
        directory: { type: 'directory', inputTransformation: (input) => untildify(input) },
        versions: { type: 'stateful', definition: new AsdfPluginVersionsParameter() }
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
    if ((await codifySpawn('which asdf', { throws: false })).status === SpawnStatus.ERROR) {
      return null;
    }

    if (parameters.directory) {
      const desiredTools = await this.getToolVersions(parameters.directory);

      for (const { plugin, version } of desiredTools) {
        const { status, data } = await codifySpawn(`asdf current ${plugin}`, { throws: false, cwd: parameters.directory });
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

    if ((await codifySpawn('which asdf', { throws: false })).status === SpawnStatus.ERROR) {
      return null;
    }

    return {
      plugin: parameters.plugin,
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
    }
  }

  async destroy(plan: DestroyPlan<AsdfInstallConfig>): Promise<void> {
    if (plan.currentConfig.directory) {
      const desiredTools = await this.getToolVersions(plan.currentConfig.directory);

      // Uninstall plugin versions listed in .tool-versions
      for (const { plugin, version } of desiredTools) {
        await codifySpawn(`asdf uninstall ${plugin} ${version}`);
      }
    }
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
