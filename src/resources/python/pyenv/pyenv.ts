import { Plan, Resource, SpawnStatus, ValidationResult } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import { homedir } from 'node:os';
import path from 'node:path';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import { FileUtils } from '../../../utils/file-utils.js';
import { PyenvGlobalParameter } from './global-parameter.js';
import { PythonVersionsParameter } from './python-versions-parameter.js';
import Ajv2020 from 'ajv/dist/2020.js';
import Schema from './pyenv-schema.json';
import { ValidateFunction } from 'ajv';

export interface PyenvConfig extends ResourceConfig {
  pythonVersions?: string[],
  global?: string,
  // TODO: Add option here to use homebrew to install instead. Default to true. Maybe add option to set default values to resource config.
}

export class PyenvResource extends Resource<PyenvConfig> {
  private ajv = new Ajv2020.default({
    strict: true,
  })
  private readonly validator: ValidateFunction;

  constructor() {
    super({
      type: 'pyenv',
      statefulParameters: [
        new PythonVersionsParameter(),
        new PyenvGlobalParameter(),
      ]
    });

    this.validator = this.ajv.compile(Schema)
  }

  async validate(config: unknown): Promise<ValidationResult> {
    const isValid = this.validator(config)

    return {
      isValid,
      errors: this.validator.errors ?? undefined,
    }
  }

  async refresh(keys: Set<keyof PyenvConfig>): Promise<Partial<PyenvConfig> | null> {
    const pyenvVersion = await codifySpawn('pyenv --version', { throws: false })
    if (pyenvVersion.status === SpawnStatus.ERROR) {
      return null
    }

    return {};
  }

  async applyCreate(plan: Plan<PyenvConfig>): Promise<void> {
    await codifySpawn('curl https://pyenv.run | bash')

    // Add to startup script
    // TODO: Need to support bash in addition to zsh here
    await codifySpawn('echo \'export PYENV_ROOT="$HOME/.pyenv"\' >> $HOME/.zshenv')
    await codifySpawn('echo \'[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"\' >> $HOME/.zshenv')
    await codifySpawn('echo \'eval "$(pyenv init -)"\' >> $HOME/.zshenv')

    //TODO: Ensure that python pre-requisite dependencies are installed. See: https://github.com/pyenv/pyenv/wiki#suggested-build-environment
  }

  async applyDestroy(plan: Plan<PyenvConfig>): Promise<void> {
    await codifySpawn('sudo rm -rf $(pyenv root)');
    await codifySpawn('sudo rm -rf $HOME/.pyenv');

    await FileUtils.removeLineFromFile(path.join(homedir(), '.zshenv'), 'export PYENV_ROOT="$HOME/.pyenv"')
    await FileUtils.removeLineFromFile(path.join(homedir(), '.zshenv'), '[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"')
    await FileUtils.removeLineFromFile(path.join(homedir(), '.zshenv'), 'eval "$(pyenv init -)"')
  }
}
