import { Resource, SpawnStatus } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import { FileUtils } from '../../../utils/file-utils.js';
import { NvmGlobalParameter } from './global-parameter.js';
import { NvmNodeVersionsParameter } from './node-versions-parameter.js';
import Schema from './nvm-schema.json';

export interface NvmConfig extends ResourceConfig {
  global?: string,
  nodeVersions?: string[],
  // TODO: Add option here to use homebrew to install instead. Default to true. Maybe add option to set default values to resource config.
}

export class NvmResource extends Resource<NvmConfig> {
  constructor() {
    super({
      parameterOptions: {
        global: { order: 2, statefulParameter: new NvmGlobalParameter() },
        nodeVersions: { order: 1, statefulParameter: new NvmNodeVersionsParameter() },
      },
      schema: Schema,
      type: 'nvm'
    });
  }

  async refresh(): Promise<Partial<NvmConfig> | null> {
    const nvmQuery = await codifySpawn('command -v nvm', { throws: false })
    if (nvmQuery.status === SpawnStatus.ERROR) {
      return null
    }

    return {};
  }

  async applyCreate(): Promise<void> {
    await codifySpawn('curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash')
  }

  async applyDestroy(): Promise<void> {
    // eslint-disable-next-line no-template-curly-in-string
    const { data: nvmDir } = await codifySpawn('echo "${NVM_DIR:-~/.nvm}"');
    await codifySpawn('nvm unload');
    await codifySpawn(`rm -rf ${nvmDir.trim()}`);

    await FileUtils.removeLineFromZshrc('export NVM_DIR="$HOME/.nvm"')
    await FileUtils.removeLineFromZshrc('[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"  # This loads nvm')
    await FileUtils.removeLineFromZshrc('[ -s "$NVM_DIR/bash_completion" ] && \\. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion')
  }
}
