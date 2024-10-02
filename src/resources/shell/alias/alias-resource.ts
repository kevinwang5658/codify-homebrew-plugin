import { CreatePlan, Resource, ResourceSettings } from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';

import { SpawnStatus, codifySpawn } from '../../../utils/codify-spawn.js';
import { FileUtils } from '../../../utils/file-utils.js';
import Schema from './alias-schema.json';

export interface AliasConfig extends StringIndexedObject {
  alias: string;
  value: string;
}

export class AliasResource extends Resource<AliasConfig> {
  getSettings(): ResourceSettings<AliasConfig> {
    return {
      id: 'alias',
      schema: Schema,
      parameterSettings: {
        value: { canModify: true }
      },
    }
  }

  override async refresh(parameters: Partial<AliasConfig>): Promise<Partial<AliasConfig> | null> {
    const { alias: desired } = parameters;

    const { data, status } = await codifySpawn(`alias ${desired}`, { throws: false })

    if (status === SpawnStatus.ERROR) {
      return null;
    }

    const matchedAlias = data.split(/\n/g)
      .find((l) => {
        const [name] = l.split('=');
        return name === desired;
      });

    if (!matchedAlias) {
      return null;
    }

    const [name, value] = matchedAlias.split('=');

    return {
      alias: name,
      value,
    }
  }

  override async create(plan: CreatePlan<AliasConfig>): Promise<void> {
    const { alias, value } = plan.desiredConfig;

    await FileUtils.addAliasToZshrc(alias, value);
  }

  // TODO: Implement updating an alias
  override async modify(): Promise<void> {
    throw new Error('Unsupported for now. Un-able to update an alias value for now')
  }

  // TODO: Implement destroy some time in the future
  override async destroy(): Promise<void> {}

}
