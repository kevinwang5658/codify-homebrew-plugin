import { codifySpawn, ParameterChange, Plan, SpawnStatus, StatefulParameter } from 'codify-plugin-lib';
import { PyenvConfig } from './main.js';

export class PyenvGlobalParameter extends StatefulParameter<PyenvConfig, 'global'>{

  get name(): 'global' {
    return 'global';
  }

  async getCurrent(desiredValue: PyenvConfig['global']): Promise<PyenvConfig['global']> {
    const { status, data } = await codifySpawn('pyenv global')

    if (status === SpawnStatus.ERROR) {
      return undefined;
    }

    return data;
  }

  async applyAdd(parameterChange: ParameterChange, plan: Plan<PyenvConfig>): Promise<void> {
    const desiredVersion = parameterChange.newValue;
    await codifySpawn(`pyenv global ${desiredVersion}`)
  }

  async applyModify(parameterChange: ParameterChange, plan: Plan<PyenvConfig>): Promise<void> {
    const desiredVersion = parameterChange.newValue;
    await codifySpawn(`pyenv global ${desiredVersion}`)
  }

  async applyRemove(parameterChange: ParameterChange, plan: Plan<PyenvConfig>): Promise<void> {
    await codifySpawn('pyenv global system')
  }
}
