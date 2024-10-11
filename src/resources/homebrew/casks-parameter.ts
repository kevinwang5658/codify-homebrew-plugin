import { ParameterSetting, SpawnStatus, StatefulParameter } from 'codify-plugin-lib';

import { codifySpawn } from '../../utils/codify-spawn.js';
import { HomebrewConfig } from './homebrew.js';

const SUDO_ASKPASS_PATH = '~/Library/Caches/codify/homebrew/sudo_prompt.sh'

export class CasksParameter extends StatefulParameter<HomebrewConfig, string[]> {

  override getSettings(): ParameterSetting {
    return {
      type: 'array',
      isElementEqual(desired, current) {
        // Handle the case where the name is fully qualified (tap + name)
        if (desired.includes('/')) {
          const formulaName = desired.split('/').at(-1);
          return formulaName === current;
        }

        return desired === current;
      },
    }
  }

  override async refresh(): Promise<null | string[]> {
    const caskQuery = await codifySpawn('brew list --casks -1')

    if (caskQuery.status === SpawnStatus.SUCCESS && caskQuery.data !== null && caskQuery.data !== undefined) {
      return caskQuery.data
        .split('\n')
        .filter(Boolean)
    }

    return null;
  }

  override async add(valueToAdd: string[]): Promise<void> {
    await this.installCasks(valueToAdd);
  }

  override async modify(newValue: string[], previousValue: string[]): Promise<void> {
    const casksToInstall = newValue.filter((x: string) => !previousValue.includes(x));
    const casksToUninstall = previousValue.filter((x: string) => !newValue.includes(x));

    await this.installCasks(casksToInstall);
    await this.uninstallCasks(casksToUninstall);
  }

  override async remove(valueToRemove: string[]): Promise<void> {
    await this.uninstallCasks(valueToRemove);
  }

  private async installCasks(casks: string[]): Promise<void> {
    if (!casks || casks.length === 0) {
      return;
    }

    const result = await codifySpawn(`SUDO_ASKPASS=${SUDO_ASKPASS_PATH} brew install --casks ${casks.join(' ')}`)

    if (result.status === SpawnStatus.SUCCESS) {

      // Casks can't detect if a program was installed by other means. If it returns this message, throw an error
      if (result.data.includes('It seems there is already an App at')) {
        throw new Error(`A program already exists for cask ${casks}`)
      }

      console.log(`Installed casks: ${casks.join(' ')}`);
    } else {
      throw new Error(`Failed to install casks: ${casks}. ${JSON.stringify(result.data, null, 2)}`)
    }
  }

  private async uninstallCasks(casks: string[]): Promise<void> {
    if (!casks || casks.length === 0) {
      return;
    }

    const result = await codifySpawn(`SUDO_ASKPASS=${SUDO_ASKPASS_PATH} brew uninstall ${casks.join(' ')}`)

    if (result.status === SpawnStatus.SUCCESS) {
      console.log(`Uninstalled casks: ${casks.join(' ')}`);
    } else {
      throw new Error(`Failed to uninstall casks: ${casks}. ${JSON.stringify(result.data, null, 2)}`)
    }
  }

}
