import { Plan, SpawnStatus, StatefulParameter } from 'codify-plugin-lib';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import { NvmConfig } from './nvm.js';

export class NvmGlobalParameter extends StatefulParameter<NvmConfig, string>{

  constructor() {
    super({
      // The current version number must be at least as specific as the desired one. Ex: 3.12.9 = 3.12 but 3 != 3.12
      isEqual: (desired: string, current: string) => current.includes(desired)
    });
  }

  async refresh(): Promise<null | string> {
    const { data, status } = await codifySpawn('nvm ls --no-colors', { throws: false })

    if (status === SpawnStatus.ERROR) {
      return null;
    }

    return this.findCurrentVersion(data);
  }

  async applyAdd(valueToAdd: string, plan: Plan<NvmConfig>): Promise<void> {
    await codifySpawn(`nvm alias default ${valueToAdd}`)
  }

  async applyModify(newValue: string, previousValue: string, allowDeletes: boolean, plan: Plan<NvmConfig>): Promise<void> {
    await codifySpawn(`nvm alias default ${newValue}`)
  }

  async applyRemove(valueToRemove: string, plan: Plan<NvmConfig>): Promise<void> {
    console.warn(`Nvm does not allow removing the global default. NodeJS will still be ${valueToRemove}. Skipping...`)
  }

  /*
      Example output:
             v16.14.2 *
             v18.0.0 *
             v18.15.0 *
             v18.18.0 *
      ->     v18.20.2 *
             v20.11.1 *
      default -> 18.20 (-> v18.20.2 *)
      iojs -> N/A (default)
      node -> stable (-> v20.11.1 *) (default)
      stable -> 20.11 (-> v20.11.1 *) (default)
      unstable -> N/A (default)
   */
  private findCurrentVersion(output: string): null | string {
    const version =  output.split('\n')
      .find((l) => l.includes('default'))

    console.log(version);

    return version
      ?.trim()
      ?.replace('default', '') // Remove word default
      ?.replace(/\(.*\)/g, '') // Remove brackets and anything inside
      ?.replaceAll(/\r*->v/g, '') ?? null; // Replace characters ->v and spaces
  }
}
