import { codifySpawn, Plan, SpawnStatus, StatefulParameter } from 'codify-plugin-lib';
import { PyenvConfig } from './main.js';

export class PyenvGlobalParameter extends StatefulParameter<PyenvConfig, string>{

  constructor() {
    super({
      name: 'global',
    });
  }

  async refresh(previousValue: string | null): Promise<string | null> {
    const { status, data } = await codifySpawn('pyenv global')

    if (status === SpawnStatus.ERROR) {
      return null;
    }

    return data;
  }

  async applyAdd(valueToAdd: string, plan: Plan<PyenvConfig>): Promise<void> {
    await codifySpawn(`pyenv global ${valueToAdd}`)
  }

  async applyModify(newValue: string, previousValue: string, plan: Plan<PyenvConfig>): Promise<void> {
    await codifySpawn(`pyenv global ${newValue}`)
  }

  async applyRemove(valueToRemove: string, plan: Plan<PyenvConfig>): Promise<void> {
    await codifySpawn('pyenv global system')
  }
}
