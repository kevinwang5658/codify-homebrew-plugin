import { ParameterSetting, Plan, SpawnStatus, StatefulParameter } from 'codify-plugin-lib';
import path from 'node:path';

import { codifySpawn } from '../../utils/codify-spawn.js';
import { FileUtils } from '../../utils/file-utils.js';
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

  async refresh(desired: string[], config: Partial<HomebrewConfig> | null): Promise<null | string[]> {
    const caskQuery = await codifySpawn('brew list --casks -1')

    if (caskQuery.status === SpawnStatus.SUCCESS && caskQuery.data !== null && caskQuery.data !== undefined) {
      const installedCasks = caskQuery.data
        .split('\n')
        .filter(Boolean)

      const notInstalledCasks = desired?.filter((c) => !installedCasks.includes(c));
      if (!notInstalledCasks || notInstalledCasks.length === 0) {
        return installedCasks;
      }

      // This serves a secondary purpose as well. It checks that each cask to install is valid (alerting the user
      // in the plan instead of in the apply)
      const casksWithConflicts = await this.findConflicts(notInstalledCasks);
      if (casksWithConflicts.length > 0) {
        // To avoid errors, we pretend that those programs were already installed by homebrew (even though it was installed outside)
        if (config?.skipAlreadyInstalledCasks) {
          installedCasks.push(...casksWithConflicts);
        } else {
          throw new Error(`Homebrew plugin: Will not be able to install casks ${casksWithConflicts.join(', ')} because they have already installed to /Applications outside of homebrew`)
        }
      }

      return installedCasks;
    }

    return null;
  }

  async add(valueToAdd: string[], plan: Plan<HomebrewConfig>): Promise<void> {
    await this.installCasks(valueToAdd, plan!.desiredConfig!.skipAlreadyInstalledCasks);
  }

  override async modify(newValue: string[], previousValue: string[], plan: Plan<HomebrewConfig>): Promise<void> {
    const casksToInstall = newValue.filter((x: string) => !previousValue.includes(x));
    const casksToUninstall = previousValue.filter((x: string) => !newValue.includes(x));

    const skipAlreadyInstalledCasks = plan.desiredConfig?.skipAlreadyInstalledCasks ?? plan.currentConfig?.skipAlreadyInstalledCasks;
    await this.installCasks(casksToInstall, skipAlreadyInstalledCasks!);
    await this.uninstallCasks(casksToUninstall);
  }

  override async remove(valueToRemove: string[]): Promise<void> {
    await this.uninstallCasks(valueToRemove);
  }

  private async installCasks(casks: string[], skipAlreadyInstalledCasks: boolean): Promise<void> {
    if (!casks || casks.length === 0) {
      return;
    }

    const conflicts = await this.findConflicts(casks);
    const casksToInstall = casks.filter((c) => !conflicts.includes(c))

    if (conflicts.length > 0) {
      if (skipAlreadyInstalledCasks) {
        console.log(`Skipping installing ${conflicts.join(', ')} because they were already installed externally.`)
      } else {
        throw new Error(`Could not install casks: ${conflicts.join(', ')} because they were already installed externally. Please delete and try again.`);
      }
    }

    if (casksToInstall.length === 0) {
      return;
    }

    const result = await codifySpawn(`SUDO_ASKPASS=${SUDO_ASKPASS_PATH} brew install --casks ${casksToInstall.join(' ')}`, { throws: false })
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

    const result = await codifySpawn(`SUDO_ASKPASS=${SUDO_ASKPASS_PATH} brew uninstall ${casks.join(' ')}`, { throws: false })

    if (result.status === SpawnStatus.SUCCESS) {
      console.log(`Uninstalled casks: ${casks.join(' ')}`);
    } else {
      throw new Error(`Failed to uninstall casks: ${casks}. ${JSON.stringify(result.data, null, 2)}`)
    }
  }

  private async findConflicts(casks: string[]): Promise<string[]> {
    const brewInfo = JSON.parse((await codifySpawn(`brew info -q --json=v2 ${casks.join(' ')}`)).data.replaceAll('\n', ''));
    const casksWithConflicts = new Array<string>();

    for (const caskInfo of brewInfo.casks) {
      const appInfo = caskInfo.artifacts.find((a: Record<string, any>) =>
        a.app !== null && a.app !== undefined && Array.isArray(a.app)
      )
      if (!appInfo || !appInfo.app) {
        continue;
      }

      for (const app of appInfo.app) {
        if (await FileUtils.exists(path.join('/Applications', app))) {
          casksWithConflicts.push(caskInfo.token) // brew's name for package name
        }
      }
    }

    return casksWithConflicts;
  }
}
