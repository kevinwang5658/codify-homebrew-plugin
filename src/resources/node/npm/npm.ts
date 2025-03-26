import { CreatePlan, DestroyPlan, RefreshContext, Resource, ResourceSettings, getPty } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';

import { NpmGlobalInstallParameter, NpmPackage } from './global-install.js';
import schema from './npm-shema.json'

export interface NpmConfig extends ResourceConfig {
  globalInstall: Array<NpmPackage | string>
}

export class Npm extends Resource<NpmConfig> {
  getSettings(): ResourceSettings<NpmConfig> {
    return {
      id: 'npm',
      schema,
      parameterSettings: {
        globalInstall: { type: 'stateful', definition: new NpmGlobalInstallParameter() },
      },
      importAndDestroy: {
        preventDestroy: true,
      }
    }
  }

  async refresh(parameters: Partial<NpmConfig>, context: RefreshContext<NpmConfig>): Promise<Partial<NpmConfig> | Partial<NpmConfig>[] | null> {
    const pty = getPty();

    const { status } = await pty.spawnSafe('which npm')
    if (status === 'error') {
      return null;
    }

    return parameters;
  }

  // Npm gets created with NodeJS
  async create(plan: CreatePlan<NpmConfig>): Promise<void> {}

  // Npm is destroyed with NodeJS
  destroy(plan: DestroyPlan<NpmConfig>): Promise<void> {}

}
