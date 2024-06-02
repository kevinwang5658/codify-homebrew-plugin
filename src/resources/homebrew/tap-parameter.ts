import { codifySpawn, Plan, SpawnStatus, StatefulParameter } from 'codify-plugin-lib';

import { HomebrewConfig } from './homebrew.js';

export class TapsParameter extends StatefulParameter<HomebrewConfig, string[]> {

  async refresh(): Promise<null | string[]> {
    const tapsQuery = await codifySpawn('brew tap')

    if (tapsQuery.status === SpawnStatus.SUCCESS && tapsQuery.data != null) {
      return tapsQuery.data
        .split('\n')
        .filter(Boolean)
    }

      return null;

  }

  async applyAdd(valueToAdd: string[], plan: Plan<HomebrewConfig>): Promise<void> {
    await this.installTaps(valueToAdd);
  }

  async applyModify(newValue: string[], previousValue: string[], allowDeletes: boolean, plan: Plan<HomebrewConfig>): Promise<void> {
    const tapsToInstall = newValue.filter((x: string) => !previousValue.includes(x))
    const tapsToUninstall = previousValue.filter((x: string) => !newValue.includes(x))

    await this.installTaps(tapsToInstall);

    if (allowDeletes) {
      await this.uninstallTaps(tapsToUninstall)
    }
  }

  async applyRemove(valueToRemove: string[], plan: Plan<HomebrewConfig>): Promise<void> {
    await this.uninstallTaps(valueToRemove);
  }

  private async installTaps(taps: string[]): Promise<void> {
    if (!taps || taps.length === 0) {
      return;
    }

    const result = await codifySpawn(`brew tap ${taps.join(' ')}`)

    if (result.status === SpawnStatus.SUCCESS) {
      console.log(`Installed taps: ${taps}`);
    } else {
      throw new Error(`Failed to install taps: ${taps}. ${JSON.stringify(result.data, null, 2)}`)
    }
  }

  private async uninstallTaps(taps: string[]): Promise<void> {
    if (!taps || taps.length === 0) {
      return;
    }

    const result = await codifySpawn(`brew untap ${taps.join(' ')}`)

    if (result.status === SpawnStatus.SUCCESS) {
      console.log(`Uninstalled taps: ${taps}`);
    } else {
      throw new Error(`Failed to uninstall taps: ${taps}. ${JSON.stringify(result.data, null, 2)}`)
    }
  }

}
