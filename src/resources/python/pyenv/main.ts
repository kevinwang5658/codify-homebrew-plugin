import { Plan, Resource, SpawnStatus, ValidationResult } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import { homedir } from 'node:os';
import path from 'node:path';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import { FileUtils } from '../../../utils/file-utils.js';
import { PyenvGlobalParameter } from './global-parameter.js';
import { PythonVersionsParameter } from './python-versions-parameter.js';

export interface PyenvConfig extends ResourceConfig {
  pythonVersions?: string[],
  global?: string,
  // TODO: Add option here to use homebrew to install instead. Default to true. Maybe add option to set default values to resource config.
}

export class PyenvResource extends Resource<PyenvConfig> {

  constructor() {
    super({
      type: 'pyenv',
      statefulParameters: [
        new PythonVersionsParameter(),
        new PyenvGlobalParameter(),
      ]
    });
  }

  async validate(config: unknown): Promise<ValidationResult> {
    // TODO: Add validation logic

    return {
      isValid: true,
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

    // Add startup script
    // TODO: Need to support bash in addition to zsh here
    await codifySpawn('echo \'export PYENV_ROOT="$HOME/.pyenv"\' >> $HOME/.zshenv')
    await codifySpawn('echo \'[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"\' >> $HOME/.zshenv')
    await codifySpawn('echo \'eval "$(pyenv init -)"\' >> $HOME/.zshenv')

    //TODO: Ensure that python pre-requisite dependencies are installed. See: https://github.com/pyenv/pyenv/wiki#suggested-build-environment

    await this.setEnvVars();
  }

  async applyDestroy(plan: Plan<PyenvConfig>): Promise<void> {
    await codifySpawn('sudo rm -rf $(pyenv root)');
    await codifySpawn('sudo rm -rf $HOME/.pyenv');

    await FileUtils.removeLineFromFile(path.join(homedir(), '.zshenv'), 'export PYENV_ROOT="$HOME/.pyenv"')
    await FileUtils.removeLineFromFile(path.join(homedir(), '.zshenv'), '[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"')
    await FileUtils.removeLineFromFile(path.join(homedir(), '.zshenv'), 'eval "$(pyenv init -)"')
  }

  private async setEnvVars(): Promise<void> {
    const pyenvRootResponse= await codifySpawn('echo \"$HOME/.pyenv\"');
    const pyenvRoot = pyenvRootResponse.data.trim();

    const newPathResponse = await codifySpawn(`echo "${pyenvRoot}/bin:$PATH"`);
    const newPath = newPathResponse.data.trim();

    process.env['PYENV_ROOT'] = pyenvRoot;
    process.env['PATH'] = newPath;
  }
}
