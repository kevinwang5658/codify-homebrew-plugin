import { Resource, ResourceSettings, SpawnStatus } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';

import { codifySpawn } from '../../../utils/codify-spawn.js';
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
    const pyenvVersion = await codifySpawn('pyenv --version', { throws: false })
    if (pyenvVersion.status === SpawnStatus.ERROR) {
      return null
    }

    return {};
  }

  override async create(): Promise<void> {
    await codifySpawn('curl https://pyenv.run | bash')

    // Add to startup script
    // TODO: Need to support bash in addition to zsh here
    await codifySpawn('echo \'export PYENV_ROOT="$HOME/.pyenv"\' >> $HOME/.zshrc')
    await codifySpawn('echo \'[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"\' >> $HOME/.zshrc')
    await codifySpawn('echo \'eval "$(pyenv init -)"\' >> $HOME/.zshrc')

    // TODO: Ensure that python pre-requisite dependencies are installed. See: https://github.com/pyenv/pyenv/wiki#suggested-build-environment
  }

  override async destroy(): Promise<void> {
    await codifySpawn('rm -rf $(pyenv root)', { requiresRoot: true });
    await codifySpawn('rm -rf $HOME/.pyenv', { requiresRoot: true });

    await FileUtils.removeLineFromZshrc('export PYENV_ROOT="$HOME/.pyenv"')
    await FileUtils.removeLineFromZshrc('[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"')
    await FileUtils.removeLineFromZshrc('eval "$(pyenv init -)"')
  }
}
