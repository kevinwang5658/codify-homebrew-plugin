import { ArrayStatefulParameter, Plan } from 'codify-plugin-lib';

import { codifySpawn, SpawnStatus } from '../../../utils/codify-spawn.js';
import { PyenvConfig } from './pyenv.js';

export class PythonVersionsParameter extends ArrayStatefulParameter<PyenvConfig, string> {

  constructor() {
    super({
      name: 'pythonVersions',
      // The current version number must be at least as specific as the desired one. Ex: 3.12.9 = 3.12 but 3 != 3.12
      isElementEqual: (desired, current) => current.includes(desired),
    });
  }

  async refresh(): Promise<string[] | null> {
    const { status, data } = await codifySpawn('pyenv versions --bare')

    if (status === SpawnStatus.ERROR) {
      return null;
    }

    return data.split('\n').filter(Boolean);
  }

  async applyAddItem(version: string, plan: Plan<PyenvConfig>): Promise<void> {
    await codifySpawn(`pyenv install ${version}`);
  }

  async applyRemoveItem(version: string, plan: Plan<PyenvConfig>): Promise<void> {
    await codifySpawn(`pyenv uninstall ${version}`);
  }
}
