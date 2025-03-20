import {
  CreatePlan,
  DestroyPlan,
  ModifyPlan,
  ParameterChange,
  RefreshContext,
  Resource,
  ResourceSettings,
  getPty
} from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';

import { codifySpawn } from '../../../utils/codify-spawn.js';

interface PipListResult {
  name: string;
  version?: string;
}

export interface PipResourceConfig extends ResourceConfig {
  install: Array<PipListResult | string>,
  virtualEnv?: string,
}

export class PipResource extends Resource<PipResourceConfig> {

  getSettings(): ResourceSettings<PipResourceConfig> {
    return {
      id: 'pip',
      parameterSettings: {
        install: {
          type: 'array',
          itemType: 'object',
          canModify: true,
          isElementEqual(desired: PipListResult | string, current: PipListResult | string) {
            if (typeof desired === 'string' && typeof current === 'string') {
              return desired === current;
            }

            // We can do this check because of the pre-filtering we are doing in refresh. It converts the current to match the desired if it is defined.
            return (desired as PipListResult).name === (current as PipListResult).name;
          }
        },
        virtualEnv: { type: 'directory' }
      },
      allowMultiple: {
        identifyingParameters: ['virtualEnv']
      }
    }
  }

  async refresh(parameters: Partial<PipResourceConfig>, context: RefreshContext<PipResourceConfig>): Promise<Partial<PipResourceConfig> | Partial<PipResourceConfig>[] | null> {
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

    console.log(parsedInstalledPackages);

    return {
      ...parameters,
      install: parsedInstalledPackages,
    }
  }

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

  async destroy(plan: DestroyPlan<PipResourceConfig>): Promise<void> {
    const { install, virtualEnv } = plan.currentConfig;

    await this.pipUninstall(install, virtualEnv);
  }

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
      + `pip install ${packagesToUninstall.join(' ')}`
    )
  }

  findMatchingForModify(d: PipListResult | string, cList: Array<PipListResult | string>): PipListResult | string | undefined {
    return cList.find((c) => {
      if (typeof d === 'string' && typeof c === 'string') {
        return d === c;
      }

      if (!(typeof d === 'object' && typeof c === 'object')) {
        return false;
      }

      if (d.name !== c.name) {
        return false;
      }

      if (d.version && d.version !== c.version) {
        return false
      }

      return true;
    })
  }
}
