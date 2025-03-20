import { ArrayParameterSetting, Plan, StatefulParameter, getPty } from 'codify-plugin-lib';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import { PipSync, PipSyncConfig } from './pip-sync.js';

export class RequirementFilesParameter extends StatefulParameter<PipSyncConfig, string[]> {
  getSettings(): ArrayParameterSetting {
    return {
      type: 'array',
      itemType: 'directory',
      canModify: true,
    }
  }

  async refresh(desired: null | string[], config: Partial<PipSyncConfig>): Promise<null | string[]> {
    if (!desired || desired?.length === 0) {
      return null;
    }
    
    const pty = getPty();
    const { status } = await pty.spawnSafe(PipSync.withVirtualEnv(`pip-sync -n ${desired?.join(' ')}`),  { cwd: config.cwd ?? undefined })
    return status === 'error' ? null : desired;
  }

  async add(valueToAdd: string[], plan: Plan<PipSyncConfig>): Promise<void> {
    await codifySpawn(PipSync.withVirtualEnv(`pip-sync ${valueToAdd.join(' ')}`), { cwd: plan.desiredConfig?.cwd ?? undefined })
  }
  
  async modify(newValue: string[], _: string[], plan: Plan<PipSyncConfig>): Promise<void> {
    await codifySpawn(PipSync.withVirtualEnv(`pip-sync ${newValue.join(' ')}`), { cwd: plan.desiredConfig?.cwd ?? undefined })
  }
  
  async remove(valueToRemove: string[], plan: Plan<PipSyncConfig>): Promise<void> {
    await codifySpawn(PipSync.withVirtualEnv(`pip-sync ${valueToRemove.join(' ')}`),  { cwd: plan.currentConfig?.cwd ?? undefined })
  }
}
