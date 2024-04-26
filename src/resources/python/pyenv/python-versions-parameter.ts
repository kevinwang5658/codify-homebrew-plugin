import { ArrayStatefulParameter, Plan } from 'codify-plugin-lib';

import { codifySpawn, SpawnStatus } from '../../../utils/codify-spawn.js';
import { PyenvConfig } from './main.js';

export class PythonVersionsParameter extends ArrayStatefulParameter<PyenvConfig, string> {

  constructor() {
    super({
      name: 'pythonVersions',
    });
  }

  async refresh(previousValue: string[] | null): Promise<string[] | null> {
    const { status, data } = await codifySpawn('pyenv versions --bare')

    if (status === SpawnStatus.ERROR) {
      return null;
    }

    return data.split('\n');
  }

  async applyAddItem(version: string, plan: Plan<PyenvConfig>): Promise<void> {
    await codifySpawn(`pyenv install ${version}`);
  }

  async applyRemoveItem(version: string, plan: Plan<PyenvConfig>): Promise<void> {
    await codifySpawn(`pyenv uninstall ${version}`);
  }
}
