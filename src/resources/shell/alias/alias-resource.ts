import { CreatePlan, Resource } from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';

import { SpawnStatus, codifySpawn } from '../../../utils/codify-spawn.js';
import { FileUtils } from '../../../utils/file-utils.js';
import Schema from './alias-schema.json';

export interface AliasConfig extends StringIndexedObject {
  alias: string;
  value: string;
}

export class AliasResource extends Resource<AliasConfig> {
  constructor() {
    super({
      parameterOptions: {
        value: { modifyOnChange: true }
      },
      schema: Schema,
      type: 'alias'
    });
  }

  async refresh(parameters: Partial<AliasConfig>): Promise<Partial<AliasConfig> | null> {
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

  async applyCreate(plan: CreatePlan<AliasConfig>): Promise<void> {
    const { alias, value } = plan.desiredConfig;

    await FileUtils.addAliasToZshrc(alias, value);
  }

  // TODO: Implement updating an alias
  async applyModify(): Promise<void> {
    throw new Error('Unsupported for now. Un-able to update an alias value for now')
  }

  // TODO: Implement destroy some time in the future
  async applyDestroy(): Promise<void> {}

}
