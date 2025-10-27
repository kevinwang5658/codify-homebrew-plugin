import { CreatePlan, DestroyPlan, getPty, Resource, ResourceSettings } from 'codify-plugin-lib';
import { RefreshContext } from 'codify-plugin-lib/src/resource/resource.js';
import { StringIndexedObject } from 'codify-schemas';

import { SpawnStatus, codifySpawn } from '../../utils/codify-spawn.js';
import schema from './action-schema.json'

export interface ActionConfig extends StringIndexedObject {
  condition?: string;
  action: string;
  cwd?: string;
}

export class ActionResource extends Resource<ActionConfig> {
  
  getSettings(): ResourceSettings<ActionConfig> {
    return {
      id: 'action',
      schema,
      parameterSettings: {
        cwd: { type: 'directory' },
      },
      importAndDestroy: {
        preventImport: true,
      },
      allowMultiple: true,
    }
  }
  
  async refresh(parameters: Partial<ActionConfig>, context: RefreshContext<ActionConfig>): Promise<Partial<ActionConfig> | Partial<ActionConfig>[] | null> {
    const $ = getPty();

    // Always run if condition doesn't exist
    if (!parameters.condition) {
      return context.commandType === 'validationPlan' ? parameters : null;
    }
    
    const { condition, action, cwd } = parameters;
    const { status } = await $.spawnSafe(condition, { cwd: cwd ?? undefined });

    return status === SpawnStatus.ERROR
      ? null
      : {
        ...(condition ? { condition } : undefined),
        ...(action ? { action } : undefined),
        ...(cwd ? { cwd } : undefined),
      };
  }
  
  async create(plan: CreatePlan<ActionConfig>): Promise<void> {
    await codifySpawn(plan.desiredConfig.action, { cwd: plan.desiredConfig.cwd ?? undefined });
  }
  
  async destroy(plan: DestroyPlan<ActionConfig>): Promise<void> {}
}
