import { Resource, ResourceSettings } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';

import { SpawnStatus, codifySpawn } from '../../../utils/codify-spawn.js';
import { FileUtils } from '../../../utils/file-utils.js';
import { NvmGlobalParameter } from './global-parameter.js';
import { NvmNodeVersionsParameter } from './node-versions-parameter.js';
import Schema from './nvm-schema.json';

export interface NvmConfig extends ResourceConfig {
  global?: string,
  nodeVersions?: string[],
}

export class NvmResource extends Resource<NvmConfig> {

  getSettings(): ResourceSettings<NvmConfig> {
    return {
      id: 'nvm',
      schema: Schema,
      parameterSettings: {
        global: { type: 'stateful', definition: new NvmGlobalParameter(), order: 2 },
        nodeVersions: { type: 'stateful', definition: new NvmNodeVersionsParameter(), order: 1 },
      },
    }
  }

  override async refresh(): Promise<Partial<NvmConfig> | null> {
    const nvmQuery = await codifySpawn('command -v nvm', { throws: false })
    if (nvmQuery.status === SpawnStatus.ERROR) {
      return null
    }

    return {};
  }

  override async create(): Promise<void> {
    // Node installer was previously used.
    const { data } = await codifySpawn('echo $npm_config_prefix')
    if (data.trim() !== '') {
      await FileUtils.addToStartupFile('unset npm_config_prefix');
    }

    const { data: installResult } = await codifySpawn('curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash')

    // Nvm doesn't handle if the init string is commented out
    // This check first checks that nvm detects the init string is there but nvm itself is still not present
    if (installResult.includes('nvm source string already in /Users/kevinwang/.zshrc')
      && (await codifySpawn('which nvm', { throws: false })).status === SpawnStatus.ERROR
    ) {
      await FileUtils.addToStartupFile('export NVM_DIR="$HOME/.nvm"')
      await FileUtils.addToStartupFile('[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" ');
    }
  }

  override async destroy(): Promise<void> {
    // eslint-disable-next-line no-template-curly-in-string
    const { data: nvmDir } = await codifySpawn('echo "${NVM_DIR:-~/.nvm}"');
    await codifySpawn('nvm unload');
    await codifySpawn(`rm -rf ${nvmDir.trim()}`);

    await FileUtils.removeLineFromZshrc('export NVM_DIR="$HOME/.nvm"')
    await FileUtils.removeLineFromZshrc('[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"  # This loads nvm')
    await FileUtils.removeLineFromZshrc('[ -s "$NVM_DIR/bash_completion" ] && \\. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion')
  }
}
