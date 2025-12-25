import { CreatePlan, DestroyPlan, Resource, ResourceSettings, SpawnStatus, getPty } from 'codify-plugin-lib';
import { OS, ResourceConfig } from 'codify-schemas';
import fs from 'node:fs/promises';
import os, { homedir } from 'node:os';
import path from 'node:path';

import { FileUtils } from '../../utils/file-utils.js';
import { Utils } from '../../utils/index.js';
import AsdfSchema from './asdf-schema.json';
import { AsdfPluginsParameter } from './plugins-parameter.js';

export interface AsdfConfig extends ResourceConfig {
  plugins: string[];
}

export class AsdfResource extends Resource<AsdfConfig> {
    getSettings(): ResourceSettings<AsdfConfig> {
      return {
        id: 'asdf',
        operatingSystems: [OS.Darwin],
        schema: AsdfSchema,
        parameterSettings: {
          plugins: { type: 'stateful', definition: new AsdfPluginsParameter() },
        }
      }
    }

    async refresh(parameters: Partial<AsdfConfig>): Promise<Partial<AsdfConfig> | Partial<AsdfConfig>[] | null> {
      const $ = getPty();

      const { status } = await $.spawnSafe('which asdf');
      return status === SpawnStatus.SUCCESS ? {} : null;
    }

    async create(plan: CreatePlan<AsdfConfig>): Promise<void> {
      const $ = getPty();

      if (!(await Utils.isHomebrewInstalled())) {
        throw new Error('Homebrew is not installed. Please install Homebrew before installing asdf.');
      }

      await $.spawn('brew install asdf', { interactive: true, env: { HOMEBREW_NO_AUTO_UPDATE: 1 } });

      await FileUtils.addAllToStartupFile([
        'export PATH="${ASDF_DATA_DIR:-$HOME/.asdf}/shims:$PATH"',
      ]);
    }

    async destroy(plan: DestroyPlan<AsdfConfig>): Promise<void> {
      if (!(await Utils.isHomebrewInstalled())) {
        return;
      }

      const $ = getPty();
      await $.spawn('brew uninstall asdf', { interactive: true, env: { HOMEBREW_NO_AUTO_UPDATE: 1 } });
      await FileUtils.removeLineFromStartupFile('export PATH="${ASDF_DATA_DIR:-$HOME/.asdf}/shims:$PATH"')
      await fs.rm(path.join(os.homedir(), '.asdf'), { recursive: true, force: true });
    }

}
