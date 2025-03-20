import {
  CreatePlan,
  DestroyPlan,
  ModifyPlan,
  ParameterChange,
  Resource,
  ResourceSettings,
  getPty
} from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import schema from './pip-schema.json';

interface PipListResult {
  name: string;
  version?: string;
}

export interface PipResourceConfig extends ResourceConfig {
  install: Array<PipListResult | string>,
  virtualEnv?: string,
}

export class Pip extends Resource<PipResourceConfig> {

  getSettings(): ResourceSettings<PipResourceConfig> {
    return {
      id: 'pip',
      schema,
      parameterSettings: {
        install: {
          type: 'array',
          itemType: 'object',
          canModify: true,
          isElementEqual: this.isEqual,
          filterInStatelessMode: (desired, current) =>
            current.filter((c) => desired.find((d) => this.isSame(c, d)))
        },
        virtualEnv: { type: 'directory', setting: true }
      },
      allowMultiple: {
        identifyingParameters: ['virtualEnv']
      },
      dependencies: ['pyenv', 'git-repository']
    }
  }

  async refresh(parameters: Partial<PipResourceConfig>): Promise<Partial<PipResourceConfig> | Partial<PipResourceConfig>[] | null> {
    const pty = getPty()

    const { status: pipStatus } = await pty.spawnSafe('which pip');
    if (pipStatus === 'error') {
      return null;
    }

    const { status: pipListStatus, data: installedPackages } = await pty.spawnSafe(
      (parameters.virtualEnv ? `source ${parameters.virtualEnv}/bin/activate; ` : '')
      + 'pip list --format=json --disable-pip-version-check'
      + (parameters.virtualEnv ? '; deactivate' : ''))

    if (pipListStatus === 'error') {
      return null;
    }

    // With the way that Codify is currently setup, we must transform the current parameters returned to match the desired if they are the same beforehand.
    // The diffing algo is not smart enough to differentiate between same two items but different (modify) and same two items but same (keep).
    const parsedInstalledPackages = JSON.parse(installedPackages)
      .map(({ name, version }: { name: string; version: string}) => {
        const match = parameters.install!.find((p) => {
          if (typeof p === 'string') {
            return p === name;
          }

          return p.name === name;
        })

        if (!match) {
          return { name, version };
        }

        if (typeof match === 'string') {
          return name;
        }

        if (!match.version) {
          return { name };
        }

        return { name, version };
      });

    return {
      ...parameters,
      install: parsedInstalledPackages,
    }
  }

  // Pip cannot be individually installed. It's installed via installing python. This only installs packages when python is first created.
  async create(plan: CreatePlan<PipResourceConfig>): Promise<void> {
    const { install, virtualEnv } = plan.desiredConfig;

    await this.pipInstall(install, virtualEnv);
  }

  async modify(pc: ParameterChange<PipResourceConfig>, plan: ModifyPlan<PipResourceConfig>): Promise<void> {
    const { install: desiredInstall, virtualEnv } = plan.desiredConfig;
    const { install: currentInstall } = plan.currentConfig;

    const toInstall = desiredInstall.filter((d) => !this.findMatchingForModify(d, currentInstall));
    const toUninstall = currentInstall.filter((c) => !this.findMatchingForModify(c, desiredInstall));

    if (toUninstall.length > 0) {
      await this.pipUninstall(toUninstall, virtualEnv);
    }

    if (toInstall.length > 0) {
      await this.pipInstall(toInstall, virtualEnv)
    }
  }

  // Pip cannot be individually destroyed.
  async destroy(plan: DestroyPlan<PipResourceConfig>): Promise<void> {}

  private async pipInstall(packages: Array<PipListResult | string>, virtualEnv?: string): Promise<void> {
    const packagesToInstall = packages.map((p) => {
      if (typeof p === 'string') {
        return p;
      }

      if (!p.version) {
        return p.name
      }

      return `${p.name}===${p.version}`;
    });

    await codifySpawn(
      (virtualEnv ? `source ${virtualEnv}/bin/activate; ` : '')
      + `pip install ${packagesToInstall.join(' ')}`
    )
  }

  private async pipUninstall(packages: Array<PipListResult | string>, virtualEnv?: string): Promise<void> {
    const packagesToUninstall = packages.map((p) => {
      if (typeof p === 'string') {
        return p;
      }

      return p.name;
    });

    await codifySpawn(
      (virtualEnv ? `source ${virtualEnv}/bin/activate; ` : '')
      + `pip uninstall -y ${packagesToUninstall.join(' ')}`
    )
  }

  findMatchingForModify(a: PipListResult | string, bList: Array<PipListResult | string>): PipListResult | string | undefined {
    return bList.find((b) => this.isEqual(a, b))
  }

  isEqual(a: PipListResult | string, b: PipListResult | string): boolean {
    if (typeof a === 'string' && typeof b === 'string') {
      return a === b;
    }

    if (!(typeof a === 'object' && typeof b === 'object')) {
      return false;
    }

    if (a.name !== b.name) {
      return false;
    }

    if (a.version && a.version !== b.version) {
      return false
    }

    return true;
  }

  isSame(a: PipListResult | string, b: PipListResult | string): boolean {
    if (typeof a === 'string' && typeof b === 'string') {
      return a === b;
    }

    if (!(typeof a === 'object' && typeof b === 'object')) {
      return false;
    }

    return a.name === b.name;
  }
}
