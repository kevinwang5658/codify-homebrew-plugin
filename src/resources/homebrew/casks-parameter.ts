import { ArrayStatefulParameter, codifySpawn, Plan, SpawnStatus } from 'codify-plugin-lib';

import { HomebrewConfig } from './homebrew.js';

export class CasksParameter extends ArrayStatefulParameter<HomebrewConfig, string> {
  constructor() {
    super({
      isElementEqual(desired, current) {
        // Handle the case where the name is fully qualified (tap + name)
        if (desired.includes('/')) {
          const formulaName = desired.split('/').at(-1);
          return formulaName === current;
        }

        return desired === current;
      },
    });
  }

  async refresh(): Promise<null | string[]> {
    const formulaeQuery = await codifySpawn('brew list --casks -1')

    if (formulaeQuery.status === SpawnStatus.SUCCESS && formulaeQuery.data != null) {
      return formulaeQuery.data
        .split('\n')
        .filter(Boolean)
    }

      return null;

  }

  async applyAdd(valueToAdd: string[], plan: Plan<HomebrewConfig>): Promise<void> {
    await this.installCasks(valueToAdd);
  }

  async applyModify(newValue: string[], previousValue: string[], allowDeletes: boolean, plan: Plan<HomebrewConfig>): Promise<void> {
    const casksToInstall = newValue.filter((x: string) => !previousValue.includes(x));
    const casksToUninstall = previousValue.filter((x: string) => !newValue.includes(x));

    await this.installCasks(casksToInstall);

    if (allowDeletes) {
      await this.uninstallCasks(casksToUninstall);
    }
  }

  async applyRemove(valueToRemove: string[], plan: Plan<HomebrewConfig>): Promise<void> {
    await this.uninstallCasks(valueToRemove);
  }

  async applyAddItem(item: string, plan: Plan<HomebrewConfig>): Promise<void> {}
  async applyRemoveItem(item: string, plan: Plan<HomebrewConfig>): Promise<void> {}

  private async installCasks(casks: string[]): Promise<void> {
    if (!casks || casks.length === 0) {
      return;
    }

    const result = await codifySpawn(`brew install --casks ${casks.join(' ')}`)

    if (result.status === SpawnStatus.SUCCESS) {
      console.log(`Installed casks: ${casks.join(' ')}`);
    } else {
      throw new Error(`Failed to install casks: ${casks}. ${JSON.stringify(result.data, null, 2)}`)
    }
  }

  private async uninstallCasks(casks: string[]): Promise<void> {
    if (!casks || casks.length === 0) {
      return;
    }

    const result = await codifySpawn(`brew uninstall ${casks.join(' ')}`)

    if (result.status === SpawnStatus.SUCCESS) {
      console.log(`Uninstalled casks: ${casks.join(' ')}`);
    } else {
      throw new Error(`Failed to uninstall casks: ${casks}. ${JSON.stringify(result.data, null, 2)}`)
    }
  }

}
