import { ParameterSetting, Plan, StatefulParameter, getPty } from 'codify-plugin-lib';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import { PipResourceConfig } from './pip.js';

export class PipInstallFilesParameter extends StatefulParameter<PipResourceConfig, Array<string>> {
  getSettings(): ParameterSetting {
    return {
      type: 'array',
      itemType: 'directory',
    }
  }

  async refresh(desired: null | string[], config: Partial<PipResourceConfig>): Promise<null | string[]> {
    const $ = getPty();

    return (await Promise.all(desired?.map(async (d) => {
      const { data } = await $.spawnSafe(`pip -vvv freeze -r ${d}`)

      if (!data || data.includes('WARNING:')) {
        return null;
      }

      return d;
    }) ?? [])).filter(Boolean) as string[];
  }

  async add(valueToAdd: string[], plan: Plan<PipResourceConfig>): Promise<void> {
    if (valueToAdd.length === 0) {
      return;
    }

    await codifySpawn(`pip install ${valueToAdd.map((v) => `-r ${v}`).join(' ')}`)
  }

  async modify(newValue: string[], previousValue: string[], plan: Plan<PipResourceConfig>): Promise<void> {
    const toInstall = newValue.filter((n) => !previousValue.includes(n));
    const toUninstall = previousValue.filter((p) => !newValue.includes(p));

    if (toUninstall.length > 0) {
      await codifySpawn(`pip uninstall ${toUninstall.map((v) => `-r ${v}`).join(' ')}`)
    }

    if (toInstall.length > 0) {
      await codifySpawn(`pip install ${toInstall.map((v) => `-r ${v}`).join(' ')}`)
    }
  }
  
  async remove(valueToRemove: string[], plan: Plan<PipResourceConfig>): Promise<void> {
    if (valueToRemove.length === 0) {
      return;
    }

    await codifySpawn(`pip uninstall ${valueToRemove.map((v) => `-r ${v}`).join(' ')}`)
  }

}
