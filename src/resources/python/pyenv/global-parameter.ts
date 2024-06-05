import { Plan, SpawnStatus, StatefulParameter } from 'codify-plugin-lib';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import { PyenvConfig } from './pyenv.js';

export class PyenvGlobalParameter extends StatefulParameter<PyenvConfig, string>{

  constructor() {
    super({
      // The current version number must be at least as specific as the desired one. Ex: 3.12.9 = 3.12 but 3 != 3.12
      isEqual: (desired: string, current: string) => current.includes(desired)
    });
  }

  async refresh(): Promise<null | string> {
    const { data, status } = await codifySpawn('pyenv global')

    if (status === SpawnStatus.ERROR) {
      return null;
    }

    return data.trim();
  }

  async applyAdd(valueToAdd: string, plan: Plan<PyenvConfig>): Promise<void> {
    await codifySpawn(`pyenv global ${valueToAdd}`)
  }

  async applyModify(newValue: string, previousValue: string, allowDeletes: boolean, plan: Plan<PyenvConfig>): Promise<void> {
    await codifySpawn(`pyenv global ${newValue}`)
  }

  async applyRemove(valueToRemove: string, plan: Plan<PyenvConfig>): Promise<void> {
    await codifySpawn('pyenv global system')
  }
}
