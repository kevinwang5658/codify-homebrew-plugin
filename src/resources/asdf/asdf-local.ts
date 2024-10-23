import { CreatePlan, DestroyPlan, ModifyPlan, ParameterChange, Resource, ResourceSettings, } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import * as fs from 'node:fs';
import path from 'node:path';

import { SpawnStatus, codifySpawn } from '../../utils/codify-spawn.js';
import { FileUtils } from '../../utils/file-utils.js';
import { untildify } from '../../utils/untildify.js';
import AsdfLocalSchema from './asdf-local-schema.json';

const CURRENT_VERSION_REGEX = /[^ ]+ +([^ ]+).*/;
const VARIOUS_VERSIONS = 'various versions';

export interface AsdfLocalConfig extends ResourceConfig {
  plugin: string;
  version: string;
  directory?: string;
  directories?: string[];
}

export class AsdfLocalResource extends Resource<AsdfLocalConfig> {
  getSettings(): ResourceSettings<AsdfLocalConfig> {
    return {
      id: 'asdf-local',
      dependencies: ['asdf', 'asdf-plugin'],
      schema: AsdfLocalSchema,
      parameterSettings: {
        directory: {
          inputTransformation: (input) => untildify(input),
        },
        directories: {
          type: 'array',
          canModify: true,
          inputTransformation: (input) => input.map((i: any) => untildify(i)),
        },
        version: {
          canModify: true,
        }
      },
      import: {
        requiredParameters: ['plugin', 'directory'],
        refreshKeys: ['plugin', 'version', 'directory'],
        defaultRefreshValues: {
          version: 'latest',
        }
      }
    }
  }

  async validate(parameters: Partial<AsdfLocalConfig>): Promise<void> {
    if (!parameters.directory && !parameters.directories) {
      throw new Error('Either directory or directories must be specified');
    }
    
    if (parameters.directory && !(await FileUtils.checkDirExistsOrThrowIfFile(parameters.directory))) {
      throw new Error(`Directory ${parameters.local} does not exist`);
    }
    
    if (parameters.directories) {
      for (const dir of parameters.directories) {
        if (!(await FileUtils.checkDirExistsOrThrowIfFile(dir))) {
          throw new Error(`Directory ${dir} in ${parameters.local} does not exist`);
        }
      }
    }
  }

  async refresh(parameters: Partial<AsdfLocalConfig>): Promise<Partial<AsdfLocalConfig> | Partial<AsdfLocalConfig>[] | null> {
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
    
    if (parameters.directory) {
      const { status, data } = await codifySpawn(`asdf current ${parameters.plugin}`, { throws: false, cwd: parameters.directory });

      if (status === SpawnStatus.ERROR || data.trim() === '') {
        return null;
      }
      
      const [_, currentVersion] = data.match(CURRENT_VERSION_REGEX)!;
      return {
        plugin: parameters.plugin,
        version: parameters.version === 'latest' ? parameters.version : currentVersion,
        directory: parameters.directory,
      }
    }

    const installedDirectories: string[] = [];
    let versionUpToDate = true;
    let latestVersion = null;
    for (const dir of parameters.directories!) {
      const { status, data } = await codifySpawn(`asdf current ${parameters.plugin}`, { throws: false, cwd: dir });
      if (status === SpawnStatus.ERROR || data.trim() === '') {
        continue;
      }

      installedDirectories.push(dir.trim());


      const [_, currentVersion] = data.match(CURRENT_VERSION_REGEX)!;
      if (parameters.version !== 'latest' && currentVersion !== parameters.version) {
        versionUpToDate = false;
        continue;
      }

      if (parameters.version === 'latest' && !latestVersion) {
        latestVersion = currentVersion;
        continue;
      }

      if (parameters.version === 'latest' && currentVersion !== latestVersion) {
        versionUpToDate = false;
      }
    }

    if (installedDirectories.length === 0) {
      return null;
    }

    return {
      plugin: parameters.plugin,
      version: versionUpToDate ? parameters.version : VARIOUS_VERSIONS,
      directories: installedDirectories.filter(Boolean),
    };
  }

  async create(plan: CreatePlan<AsdfLocalConfig>): Promise<void> {
    if (plan.desiredConfig.directory) {
      await codifySpawn(`asdf local ${plan.desiredConfig.plugin} ${plan.desiredConfig.version}`, { cwd: plan.desiredConfig.directory });
      return;
    }

    for (const dir of plan.desiredConfig.directories!) {
      await codifySpawn(`asdf local ${plan.desiredConfig.plugin} ${plan.desiredConfig.version}`, { cwd: dir });
    }
  }

  async modify(pc: ParameterChange<AsdfLocalConfig>, plan: ModifyPlan<AsdfLocalConfig>): Promise<void> {
    if (plan.desiredConfig.directory) {
      await codifySpawn(`asdf local ${plan.desiredConfig.plugin} ${plan.desiredConfig.version}`, { cwd: plan.desiredConfig.directory });
      return;
    }

    for (const dir of plan.desiredConfig.directories!) {
      await codifySpawn(`asdf local ${plan.desiredConfig.plugin} ${plan.desiredConfig.version}`, { cwd: dir });
    }
  }

  async destroy(plan: DestroyPlan<AsdfLocalConfig>): Promise<void> {
    if (plan.currentConfig.directory) {
      await FileUtils.removeLineFromFile(path.join(plan.currentConfig.directory, '.tool-versions'), plan.currentConfig.plugin);
      return;
    }

    for (const dir of plan.currentConfig.directories!) {
      console.log(path.join(dir, '.tool-versions'))
      await FileUtils.removeLineFromFile(path.join(dir, '.tool-versions'), plan.currentConfig.plugin);
      console.log(fs.readFileSync(path.join(dir, '.tool-versions')).toString());
    }
  }
}
