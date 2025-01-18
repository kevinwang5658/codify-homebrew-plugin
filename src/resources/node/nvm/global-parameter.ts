import { getPty, ParameterSetting, SpawnStatus, StatefulParameter } from 'codify-plugin-lib';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import { NvmConfig } from './nvm.js';

export class NvmGlobalParameter extends StatefulParameter<NvmConfig, string>{

  getSettings(): ParameterSetting {
    return {
      type: 'version',
    }
  }

  override async refresh(): Promise<null | string> {
    const $ = getPty();

    const { data, status } = await $.spawnSafe('nvm ls default --no-colors')

    if (status === SpawnStatus.ERROR) {
      return null;
    }

    return this.formatVersion(data);
  }

  override async add(valueToAdd: string): Promise<void> {
    await codifySpawn(`nvm alias default ${valueToAdd}`)
  }

  override async modify(newValue: string): Promise<void> {
    await codifySpawn(`nvm alias default ${newValue}`)
  }

  override async remove(valueToRemove: string): Promise<void> {
    console.warn(`Nvm does not allow removing the global default. NodeJS will still be ${valueToRemove}. Skipping...`)
  }

  private formatVersion(output: string): null | string {
    return output?.replaceAll('->', '')
      ?.replaceAll(' ', '')
      ?.replaceAll('v', '')
      ?.replaceAll('*', '')
      ?.trim()
  }
}
