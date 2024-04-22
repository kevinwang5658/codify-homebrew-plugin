import { codifySpawn, ParameterChange, Plan, SpawnStatus, StatefulParameter } from 'codify-plugin-lib';
import { HomebrewConfig } from './main.js';

export class TapsParameter extends StatefulParameter<HomebrewConfig, 'taps'> {
  get name(): "taps" {
    return 'taps';
  }

  async getCurrent(desiredValue?: string[]): Promise<HomebrewConfig['taps']> {
    const tapsQuery = await codifySpawn('brew tap')

    if (tapsQuery.status === SpawnStatus.SUCCESS && tapsQuery.data != null) {
      return tapsQuery.data
        .split('\n')
        .filter((x) => desiredValue?.find((y) => x === y))
    } else {
      return undefined;
    }
  }

  async applyAdd(parameterChange: ParameterChange, plan: Plan<HomebrewConfig>): Promise<void> {
    if (!plan.resourceConfig.taps) {
      return;
    }

    await this.installTap(parameterChange.newValue);
  }

  async applyModify(parameterChange: ParameterChange, plan: Plan<HomebrewConfig>): Promise<void> {
    const { previousValue, newValue } = parameterChange;

    const tapsToInstall = newValue.filter((x: string) => !previousValue.includes(x))
    const tapsToUninstall = previousValue.filter((x: string) => !newValue.includes(x))

    await this.installTap(tapsToInstall);
    await this.uninstallTap(tapsToUninstall)
  }

  async applyRemove(parameterChange: ParameterChange, plan: Plan<HomebrewConfig>): Promise<void> {
    if (!parameterChange.newValue) {
      return;
    }

    await this.uninstallTap(parameterChange.newValue);
  }

  private async installTap(taps: string[]): Promise<void> {
    if (!taps || taps.length === 0) {
      return;
    }

    const result = await codifySpawn(`brew tap ${taps.join(' ')}`)

    if (result.status === SpawnStatus.SUCCESS) {
      console.log(`Installed tap: ${taps}`);
    } else {
      throw new Error(`Failed to install tap: ${taps}. ${JSON.stringify(result.data, null, 2)}`)
    }
  }

  private async uninstallTap(taps: string[]): Promise<void> {
    if (!taps || taps.length === 0) {
      return;
    }

    const result = await codifySpawn(`brew untap ${taps.join(' ')}`)

    if (result.status === SpawnStatus.SUCCESS) {
      console.log(`Uninstalled cask: ${taps}`);
    } else {
      throw new Error(`Failed to uninstall cask: ${taps}. ${JSON.stringify(result.data, null, 2)}`)
    }
  }

}
