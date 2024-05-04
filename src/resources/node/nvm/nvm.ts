import { Plan, Resource, SpawnStatus, ValidationResult } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import { homedir } from 'node:os';
import path from 'node:path';
import { ValidateFunction } from 'ajv';
import { codifySpawn } from '../../../utils/codify-spawn.js';
import { FileUtils } from '../../../utils/file-utils.js';
import { NvmNodeVersionsParameter } from './node-versions-parameter.js';
import { NvmGlobalParameter } from './global-parameter.js';
import Schema from './nvm-schema.json';
import Ajv2020 from 'ajv/dist/2020.js';

export interface NvmConfig extends ResourceConfig {
  nodeVersions?: string[],
  global?: string,
  // TODO: Add option here to use homebrew to install instead. Default to true. Maybe add option to set default values to resource config.
}

export class NvmResource extends Resource<NvmConfig> {
  private ajv = new Ajv2020.default({
    strict: true,
  })
  private readonly validator: ValidateFunction;

  constructor() {
    super({
      type: 'nvm',
      statefulParameters: [
        new NvmNodeVersionsParameter(),
        new NvmGlobalParameter(),
      ]
    });

    this.validator = this.ajv.compile(Schema);
  }

  async validate(config: unknown): Promise<ValidationResult> {
    const isValid = this.validator(config)

    return {
      isValid,
      errors: this.validator.errors ?? undefined,
    }
  }

  async refresh(keys: Set<keyof NvmConfig>): Promise<Partial<NvmConfig> | null> {
    const nvmQuery = await codifySpawn('command -v nvm', { throws: false })
    if (nvmQuery.status === SpawnStatus.ERROR) {
      return null
    }

    return {};
  }

  async applyCreate(plan: Plan<NvmConfig>): Promise<void> {
    await codifySpawn('curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash')

    // Add to startup script
    // TODO: Need to support bash in addition to zsh here
    await codifySpawn(`echo 'export NVM_DIR="$([ -z "\${XDG_CONFIG_HOME-}" ] && printf %s "\${HOME}/.nvm" || printf %s "\${XDG_CONFIG_HOME}/nvm")"' >> $HOME/.zshenv`)
    await codifySpawn(`echo '[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" # This loads nvm' >> $HOME/.zshenv`)
    await codifySpawn(`echo '[[ -r $NVM_DIR/bash_completion ]] && \\. $NVM_DIR/bash_completion' >> $HOME/.zshenv`)
  }

  async applyDestroy(plan: Plan<NvmConfig>): Promise<void> {
    const { data: nvmDir } = await codifySpawn('echo "${NVM_DIR:-~/.nvm}"');
    await codifySpawn('nvm unload');
    await codifySpawn(`rm -rf ${nvmDir.trim()}`);

    await FileUtils.removeLineFromFile(path.join(homedir(), '.zshenv'), 'echo \'export NVM_DIR="$([ -z "\${XDG_CONFIG_HOME-}" ] && printf %s "\${HOME}/.nvm" || printf %s "\${XDG_CONFIG_HOME}/nvm")"')
    await FileUtils.removeLineFromFile(path.join(homedir(), '.zshenv'), '[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" # This loads nvm')
    await FileUtils.removeLineFromFile(path.join(homedir(), '.zshenv'), 'eval "[[ -r $NVM_DIR/bash_completion ]] && \\. $NVM_DIR/bash_completion')
  }
}
