import { CreatePlan, DestroyPlan, RefreshContext, Resource, ResourceSettings, getPty } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import schema from './pip-sync-schema.json'
import { RequirementFilesParameter } from './requirement-files-parameter.js';

export interface PipSyncConfig extends ResourceConfig {
  requirementFiles: string[];
  virtualEnv?: string;
  cwd?: string;
}

export class PipSync extends Resource<PipSyncConfig> {
  getSettings(): ResourceSettings<PipSyncConfig> {
    return {
      id: 'pip-sync',
      schema,
      parameterSettings: {
        requirementFiles: { type: 'stateful', definition: new RequirementFilesParameter() },
        virtualEnv: { type: 'directory', setting: true },
        cwd: { type: 'directory', setting: true }
      },
      dependencies: ['pyenv', 'pip', 'venv-project', 'virtualenv-project', 'virtualenv'],
      allowMultiple: {
        identifyingParameters: ['virtualEnv'],
      }
    };
  }

  async refresh(parameters: Partial<PipSyncConfig>, context: RefreshContext<PipSyncConfig>): Promise<Partial<PipSyncConfig> | Partial<PipSyncConfig>[] | null> {
    const pty = getPty()

    const { status: pipStatus } = await pty.spawnSafe(PipSync.withVirtualEnv('which pip', parameters.virtualEnv), { cwd: parameters.cwd ?? undefined });
    if (pipStatus === 'error') {
      return null;
    }

    const { status: pipSyncStatus } = await pty.spawnSafe(PipSync.withVirtualEnv('which pip-sync', parameters.virtualEnv), { cwd: parameters.cwd ?? undefined })
    return pipSyncStatus === 'error' ? null : parameters;
  }

  async create(plan: CreatePlan<PipSyncConfig>): Promise<void> {
    await codifySpawn(PipSync.withVirtualEnv('pip install pip-tools', plan.desiredConfig.virtualEnv), { cwd: plan.desiredConfig.cwd ?? undefined })
  }

  async destroy(plan: DestroyPlan<PipSyncConfig>): Promise<void> {
    await codifySpawn(PipSync.withVirtualEnv('pip uninstall -y pip-tools', plan.currentConfig.virtualEnv), { cwd: plan.currentConfig.cwd ?? undefined })
  }

  static withVirtualEnv(command: string, virtualEnv?: string, ): string {
    if (!virtualEnv) {
      return command;
    }

    return `( set -e; source ${virtualEnv}/bin/activate; ${command}; deactivate )`;
  }

}
