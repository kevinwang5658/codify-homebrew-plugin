import { StatefulParameter } from 'codify-plugin-lib';
import { HomebrewConfig } from './main.js';
import { codifySpawn, ParameterChange, Plan, SpawnStatus } from 'codify-plugin-lib';

export class FormulaeParameter extends StatefulParameter<HomebrewConfig, 'formulae'> {
  get name(): "formulae" {
    return 'formulae';
  }

  async getCurrent(desiredValue?: string[]): Promise<HomebrewConfig["formulae"]> {
    const formulaeQuery = await codifySpawn('brew list --formula -1')

    if (formulaeQuery.status === SpawnStatus.SUCCESS && formulaeQuery.data != null) {
      return formulaeQuery.data
        .split('\n')
        .filter((x) => desiredValue?.find((y) => x === y))
    } else {
      return undefined;
    }
  }

  async applyAdd(parameterChange: ParameterChange, plan: Plan<HomebrewConfig>): Promise<void> {
    if (!plan.resourceConfig.formulae) {
      return;
    }

    for (const formula of plan.resourceConfig.formulae) {
      await this.installFormula(formula)
    }
  }

  async applyModify(parameterChange: ParameterChange, plan: Plan<HomebrewConfig>): Promise<void> {
    const { previousValue, newValue } = parameterChange;

    const formulaeToInstall = newValue.filter((x: string) => !previousValue.includes(x))
    const formulaeToUninstall = previousValue.filter((x: string) => !newValue.includes(x))

    for (const formula of formulaeToInstall) {
      await this.installFormula(formula)
    }

    for (const formula of formulaeToUninstall) {
      await this.uninstallFormula(formula)
    }
  }

  async applyRemove(parameterChange: ParameterChange, plan: Plan<HomebrewConfig>): Promise<void> {
    if (!plan.resourceConfig.formulae) {
      return;
    }

    for (const formula of plan.resourceConfig.formulae) {
      await this.uninstallFormula(formula)
    }
  }

  private async installFormula(formula: string): Promise<void> {
    const result = await codifySpawn(`brew install --formula ${formula}`)

    if (result.status === SpawnStatus.SUCCESS) {
      console.log(`Installed formula: ${formula}`);
    } else {
      throw new Error(`Failed to install formula: ${formula}. ${JSON.stringify(result.data, null, 2)}`)
    }
  }

  private async uninstallFormula(formula: string): Promise<void> {
    const result = await codifySpawn(`brew uninstall --formula ${formula}`)

    if (result.status === SpawnStatus.SUCCESS) {
      console.log(`Uninstalled formula: ${formula}`);
    } else {
      throw new Error(`Failed to uninstall formula: ${formula}. ${JSON.stringify(result.data, null, 2)}`)
    }
  }

}
