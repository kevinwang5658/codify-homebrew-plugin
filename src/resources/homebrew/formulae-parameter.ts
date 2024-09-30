import { ArrayParameterSetting, SpawnStatus, StatefulParameter } from 'codify-plugin-lib';

import { codifySpawn } from '../../utils/codify-spawn.js';
import { HomebrewConfig } from './homebrew.js';

const SUDO_ASKPASS_PATH = '~/Library/Caches/codify/homebrew/sudo_prompt.sh'

export class FormulaeParameter extends StatefulParameter<HomebrewConfig, string[]> {
  getSettings(): ArrayParameterSetting {
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
    const formulaeQuery = await codifySpawn('brew list --formula -1')

    if (formulaeQuery.status === SpawnStatus.SUCCESS && formulaeQuery.data !== null && formulaeQuery.data !== undefined) {
      return formulaeQuery.data
        .split('\n')
        .filter(Boolean);
    }

    return null;
  }

  async add(valueToAdd: string[]): Promise<void> {
    await this.installFormulae(valueToAdd);
  }

  async modify(newValue: string[], previousValue: string[]): Promise<void> {
    const formulaeToInstall = newValue.filter((x: string) => !previousValue.includes(x));
    const formulaeToUninstall = previousValue.filter((x: string) => !newValue.includes(x));

    await this.installFormulae(formulaeToInstall);
    await this.uninstallFormulae(formulaeToUninstall);
  }

  async remove(valueToRemove: string[]): Promise<void> {
    await this.uninstallFormulae(valueToRemove);
  }

  private async installFormulae(formulae: string[]): Promise<void> {
    if (!formulae || formulae.length === 0) {
      return;
    }

    const result = await codifySpawn(`SUDO_ASKPASS=${SUDO_ASKPASS_PATH} brew install --formula ${formulae.join(' ')}`)

    if (result.status === SpawnStatus.SUCCESS) {
      console.log(`Installed formula: ${formulae.join(' ')}`);
    } else {
      throw new Error(`Failed to install formula: ${formulae}. ${JSON.stringify(result.data, null, 2)}`)
    }
  }

  private async uninstallFormulae(formulae: string[]): Promise<void> {
    if (!formulae || formulae.length === 0) {
      return;
    }

    const result = await codifySpawn(`SUDO_ASKPASS=${SUDO_ASKPASS_PATH} brew uninstall ${formulae.join(' ')}`)

    if (result.status === SpawnStatus.SUCCESS) {
      console.log(`Uninstalled formulae: ${formulae.join(' ')}`);
    } else {
      throw new Error(`Failed to uninstall formulae: ${formulae}. ${JSON.stringify(result.data, null, 2)}`)
    }
  }
}
