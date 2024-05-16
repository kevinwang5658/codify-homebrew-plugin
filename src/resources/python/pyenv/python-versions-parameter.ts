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

  async refresh(desired: string[]): Promise<string[] | null> {
    // Use pyenv latest to match the desired values to existing installed versions. The
    // reason behind this is that pyenv does special version processing during installs. For ex: specifying
    // pyenv install 3 will install the latest version 3.12.2
    const matchedVersions = desired
      ? await Promise.all(desired.map(async (desiredVersion) => {
        const { status, data } = await codifySpawn(`pyenv latest ${desiredVersion}`, { throws: false });
        if (status === SpawnStatus.ERROR) {
          return null;
        }

        return desiredVersion;
      }))
      : [];

    // TODO: Add this when stateful parameters get implemented. Otherwise this is un-needed.
    // const { status, data } = await codifySpawn('pyenv versions --bare')
    // if (status === SpawnStatus.ERROR) {
    //   return null;
    // }

    return matchedVersions.filter(Boolean) as string[];
  }

  async applyAddItem(version: string, plan: Plan<PyenvConfig>): Promise<void> {
    await codifySpawn(`pyenv install ${version}`);
  }

  async applyRemoveItem(version: string, plan: Plan<PyenvConfig>): Promise<void> {
    await codifySpawn(`pyenv uninstall ${version}`);
  }
}
