import { ArrayStatefulParameter, Plan, SpawnStatus } from 'codify-plugin-lib';
import { HomebrewConfig } from './homebrew.js';
import { codifySpawn } from '../../utils/codify-spawn.js';

export class FormulaeParameter extends ArrayStatefulParameter<HomebrewConfig, string> {
  constructor() {
    super({
      name: 'formulae',
      isElementEqual: (desired, current) => {
        // Handle the case where the name is fully qualified (tap + name)
        if (desired.includes('/')) {
          const formulaName = desired.split('/').slice(-1)[0];
          return formulaName === current;
        }

        return desired === current;
      },
    });
  }

  async refresh(): Promise<string[] | null> {
    const formulaeQuery = await codifySpawn('brew list --formula -1')

    if (formulaeQuery.status === SpawnStatus.SUCCESS && formulaeQuery.data != null) {
      return formulaeQuery.data
        .split('\n')
        .filter(Boolean);
    } else {
      return null;
    }
  }

  async applyAdd(valueToAdd: string[], plan: Plan<HomebrewConfig>): Promise<void> {
    await this.installFormulae(valueToAdd);
  }

  async applyModify(newValue: string[], previousValue: string[], allowDeletes: boolean, plan: Plan<HomebrewConfig>): Promise<void> {
    const formulaeToInstall = newValue.filter((x: string) => !previousValue.includes(x));
    const formulaeToUninstall = previousValue.filter((x: string) => !newValue.includes(x));

    await this.installFormulae(formulaeToInstall);

    if (allowDeletes) {
      await this.uninstallFormulae(formulaeToUninstall);
    }
  }

  async applyRemove(valueToRemove: string[], plan: Plan<HomebrewConfig>): Promise<void> {
    await this.uninstallFormulae(valueToRemove);
  }

  private async installFormulae(formulae: string[]): Promise<void> {
    if (!formulae || formulae.length === 0) {
      return;
    }

    const result = await codifySpawn(`brew install --formula ${formulae.join(' ')}`)

    if (result.status === SpawnStatus.SUCCESS) {
      console.log(`Installed formula: ${formulae.join(' ')}`);
    } else {
      throw new Error(`Failed to install formula: ${formulae}. ${JSON.stringify(result.data, null, 2)}`)
    }
  }

  // These aren't being used since the apply* methods of the parent are being overridden
  async applyAddItem(item: string, plan: Plan<HomebrewConfig>): Promise<void> {}
  async applyRemoveItem(item: string, plan: Plan<HomebrewConfig>): Promise<void> {}

  private async uninstallFormulae(formulae: string[]): Promise<void> {
    if (!formulae || formulae.length === 0) {
      return;
    }

    const result = await codifySpawn(`brew uninstall ${formulae.join(' ')}`)

    if (result.status === SpawnStatus.SUCCESS) {
      console.log(`Uninstalled formulae: ${formulae.join(' ')}`);
    } else {
      throw new Error(`Failed to uninstall formulae: ${formulae}. ${JSON.stringify(result.data, null, 2)}`)
    }
  }
}
