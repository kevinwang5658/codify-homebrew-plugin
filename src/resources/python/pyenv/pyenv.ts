import { getPty, Resource, ResourceSettings } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { SpawnStatus, codifySpawn } from '../../../utils/codify-spawn.js';
import { FileUtils } from '../../../utils/file-utils.js';
import { PyenvGlobalParameter } from './global-parameter.js';
import Schema from './pyenv-schema.json';
import { PythonVersionsParameter } from './python-versions-parameter.js';

export interface PyenvConfig extends ResourceConfig {
  global?: string,
  pythonVersions?: string[],
  // TODO: Add option here to use homebrew to install instead. Default to true. Maybe add option to set default values to resource config.
}

export class PyenvResource extends Resource<PyenvConfig> {
  getSettings(): ResourceSettings<PyenvConfig> {
    return {
      id: 'pyenv',
      schema: Schema,
      parameterSettings: {
        global: { type: 'stateful', definition: new PyenvGlobalParameter(), order: 2 },
        pythonVersions: { type: 'stateful', definition: new PythonVersionsParameter(), order: 1, },
      },
    }
  }

  override async refresh(): Promise<Partial<PyenvConfig> | null> {
    const $ = getPty();

    const pyenvVersion = await $.spawnSafe('pyenv --version')
    if (pyenvVersion.status === SpawnStatus.ERROR) {
      return null
    }

    return {};
  }

  override async create(): Promise<void> {
    // Pyenv directory exists already but PYENV_ROOT variable is not set. Most likely pyenv is installed but not initialized
    if (fs.existsSync(path.join(os.homedir(), '.pyenv'))
      && (await codifySpawn('[ -z $PYENV_ROOT ]', { throws: false })).status === SpawnStatus.SUCCESS
    ) {
      await this.addPyenvInitialization();

      // Check if pyenv is installed properly, if it is then return. If not destroy the current
      // installation so it can be re-installed.
      if (await this.isValidInstall()) {
        return;
      } else {
        await this.destroy();
      }
    }
    
    await codifySpawn('curl https://pyenv.run | bash')

    // Add to startup script
    await this.addPyenvInitialization();
  }

  override async destroy(): Promise<void> {
    await codifySpawn('rm -rf $(pyenv root)', { requiresRoot: true });
    await codifySpawn('rm -rf $HOME/.pyenv', { requiresRoot: true });

    await FileUtils.removeLineFromZshrc('export PYENV_ROOT="$HOME/.pyenv"')
    await FileUtils.removeLineFromZshrc('[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"')
    await FileUtils.removeLineFromZshrc('eval "$(pyenv init -)"')
  }

  private async addPyenvInitialization(): Promise<void> {
    await FileUtils.addAllToStartupFile([
      'export PYENV_ROOT="$HOME/.pyenv"',
      '[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"',
      'eval "$(pyenv init -)"'
    ]);
  }

  // TODO: Need to support bash in addition to zsh here
  private async isValidInstall(): Promise<boolean> {
    const { data: doctor } = await codifySpawn('pyenv doctor', { throws: false })
    return doctor.includes('Congratulations! You are ready to build pythons!');
  }
}
