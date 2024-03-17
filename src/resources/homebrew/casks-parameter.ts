import { StatefulParameter } from 'codify-plugin-lib';
import { HomebrewConfig } from './main.js';
import { codifySpawn, ParameterChange, Plan, SpawnStatus } from 'codify-plugin-lib';

export class CasksParameter extends StatefulParameter<HomebrewConfig, 'casks'> {
  get name(): "casks" {
    return 'casks';
  }

  async getCurrent(desiredValue?: string[]): Promise<HomebrewConfig["casks"]> {
    const casksQuery = await codifySpawn('brew list --casks -1')

    if (casksQuery.status === SpawnStatus.SUCCESS && casksQuery.data != null) {
      return casksQuery.data
        .split('\n')
        .filter((x) => desiredValue?.find((y) => x === y))
    } else {
      return undefined;
    }
  }

  async applyAdd(parameterChange: ParameterChange, plan: Plan<HomebrewConfig>): Promise<void> {
    if (!plan.resourceConfig.casks) {
      return;
    }

    for (const cask of plan.resourceConfig.casks) {
      await this.installCask(cask)
    }
  }

  async applyModify(parameterChange: ParameterChange, plan: Plan<HomebrewConfig>): Promise<void> {
    const { previousValue, newValue } = parameterChange;

    const casksToInstall = newValue.filter((x: string) => !previousValue.includes(x))
    const casksToUninstall = previousValue.filter((x: string) => !newValue.includes(x))

    for (const cask of casksToInstall) {
      await this.installCask(cask)
    }

    for (const cask of casksToUninstall) {
      await this.uninstallCask(cask)
    }
  }

  async applyRemove(parameterChange: ParameterChange, plan: Plan<HomebrewConfig>): Promise<void> {
    if (!plan.resourceConfig.casks) {
      return;
    }

    for (const casks of plan.resourceConfig.casks) {
      await this.uninstallCask(casks)
    }
  }

  private async installCask(cask: string): Promise<void> {
    const result = await codifySpawn(`brew install --cask ${cask}`)

    if (result.status === SpawnStatus.SUCCESS) {
      console.log(`Installed cask: ${cask}`);
    } else {
      throw new Error(`Failed to install cask: ${cask}. ${JSON.stringify(result.data, null, 2)}`)
    }
  }

  private async uninstallCask(cask: string): Promise<void> {
    const result = await codifySpawn(`brew uninstall --cask ${cask}`)

    if (result.status === SpawnStatus.SUCCESS) {
      console.log(`Uninstalled cask: ${cask}`);
    } else {
      throw new Error(`Failed to uninstall cask: ${cask}. ${JSON.stringify(result.data, null, 2)}`)
    }
  }

}
