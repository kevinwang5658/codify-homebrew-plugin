import { ArrayStatefulParameter, Plan } from 'codify-plugin-lib';

import { codifySpawn, SpawnStatus } from '../../../utils/codify-spawn.js';
import { NvmConfig } from './nvm.js';

export class NvmNodeVersionsParameter extends ArrayStatefulParameter<NvmConfig, string> {

  constructor() {
    super({
      name: 'nodeVersions',
      // The current version number must be at least as specific as the desired one. Ex: 3.12.9 = 3.12 but 3 != 3.12
      isElementEqual: (desired, current) => current.includes(desired),
    });
  }

  async refresh(): Promise<string[] | null> {
    const { status, data } = await codifySpawn('nvm ls --no-colors --no-alias')

    if (status === SpawnStatus.ERROR) {
      return null;
    }

    return this.parseLsOutput(data)
  }

  async applyAddItem(version: string, plan: Plan<NvmConfig>): Promise<void> {
    await codifySpawn(`nvm install ${version}`);
  }

  async applyRemoveItem(version: string, plan: Plan<NvmConfig>): Promise<void> {
    await codifySpawn(`nvm uninstall ${version}`);
  }

  private parseLsOutput(output: string): string[] {
    return output.split('\n')
      .map((l) => {
        return l.trim()
          .replaceAll(/\r*->v/g, '')
      })
      .filter(Boolean)
  }
}
