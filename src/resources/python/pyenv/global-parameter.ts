import { Plan, SpawnStatus, StatefulParameter } from 'codify-plugin-lib';
import { PyenvConfig } from './pyenv.js';
import { codifySpawn } from '../../../utils/codify-spawn.js';

export class PyenvGlobalParameter extends StatefulParameter<PyenvConfig, string>{

  constructor() {
    super({
      name: 'global',
      // The current version number must be at least as specific as the desired one. Ex: 3.12.9 = 3.12 but 3 != 3.12
      isEqual: (desired: string, current: string) => current.includes(desired)
    });
  }

  async refresh(): Promise<string | null> {
    const { status, data } = await codifySpawn('pyenv global')

    if (status === SpawnStatus.ERROR) {
      return null;
    }

    return data;
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
