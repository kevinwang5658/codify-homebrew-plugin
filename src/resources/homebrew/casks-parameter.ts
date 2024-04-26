import { codifySpawn, Plan, SpawnStatus, StatefulParameter } from 'codify-plugin-lib';
import { HomebrewConfig } from './homebrew.js';

export class CasksParameter extends StatefulParameter<HomebrewConfig, string[]> {
  constructor() {
    super({
      name: 'casks',
    });
  }

  async refresh(previousValue: string[] | null): Promise<string[] | null> {
    const formulaeQuery = await codifySpawn('brew list --casks -1')

    if (formulaeQuery.status === SpawnStatus.SUCCESS && formulaeQuery.data != null) {
      return formulaeQuery.data
        .split('\n')
    } else {
      return null;
    }
  }

  async applyAdd(valueToAdd: string[], plan: Plan<HomebrewConfig>): Promise<void> {
    await this.installCasks(valueToAdd);
  }

  async applyModify(newValue: string[], previousValue: string[], plan: Plan<HomebrewConfig>): Promise<void> {
    const casksToInstall = newValue.filter((x: string) => !previousValue.includes(x));
    const casksToUninstall = previousValue.filter((x: string) => !newValue.includes(x));

    await this.uninstallCasks(casksToUninstall);
    await this.installCasks(casksToInstall);
  }

  async applyRemove(valueToRemove: string[], plan: Plan<HomebrewConfig>): Promise<void> {
    await this.uninstallCasks(valueToRemove);
  }

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
