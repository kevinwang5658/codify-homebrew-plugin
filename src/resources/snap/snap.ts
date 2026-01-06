import { CreatePlan, Resource, ResourceSettings, SpawnStatus, getPty } from 'codify-plugin-lib';
import { OS, ResourceConfig } from 'codify-schemas';

import { SnapInstallParameter, SnapPackage } from './install-parameter.js';
import schema from './snap-schema.json';

export interface SnapConfig extends ResourceConfig {
  install: Array<SnapPackage | string>;
}

export class SnapResource extends Resource<SnapConfig> {

  override getSettings(): ResourceSettings<SnapConfig> {
    return {
      id: 'snap',
      operatingSystems: [OS.Linux],
      schema,
      parameterSettings: {
        install: { type: 'stateful', definition: new SnapInstallParameter() }
      }
    };
  }

  override async refresh(parameters: Partial<SnapConfig>): Promise<Partial<SnapConfig> | null> {
    const $ = getPty();

    const snapCheck = await $.spawnSafe('which snap');
    if (snapCheck.status === SpawnStatus.ERROR) {
      return null;
    }

    return parameters;
  }

  override async create(_plan: CreatePlan<SnapConfig>): Promise<void> {
    const $ = getPty();
    await $.spawn('apt update', { requiresRoot: true })
    await $.spawn('apt install -y snapd', { requiresRoot: true })
  }

  override async destroy(): Promise<void> {
    // snap is a core system component and should not be removed
    const $ = getPty();
    await $.spawn('apt uninstall snapd', { requiresRoot: true })
  }
}
