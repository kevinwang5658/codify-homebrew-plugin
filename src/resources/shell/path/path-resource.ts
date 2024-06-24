import { CreatePlan, ModifyPlan, ParameterChange, Resource } from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import { FileUtils } from '../../../utils/file-utils.js';
import { untildify } from '../../../utils/untildify.js';
import Schema from './path-schema.json';

export interface PathConfig extends StringIndexedObject {
  path: string;
  paths: string[];
  prepend: boolean;
}

export class PathResource extends Resource<PathConfig> {
  constructor() {
    super({
      parameterOptions: {
        paths: { modifyOnChange: true },
        prepend: { default: false }
      },
      schema: Schema,
      type: 'path'
    });
  }

  override async customValidation(parameters: Partial<PathConfig>): Promise<void> {
    if (parameters.path && parameters.paths) {
      throw new Error('Both path and paths cannot be specified together')
    }
  }

  async refresh(parameters: Partial<PathConfig>): Promise<Partial<PathConfig> | null> {
    const { data: path } = await codifySpawn('echo $PATH')

    if (parameters.path && (path.includes(parameters.path) || path.includes(untildify(parameters.path)))) {
        return parameters;
    }

    if (parameters.paths && parameters.paths.some((desired) => path.includes(desired))) {
      const result = { paths: [] as string[], prepend: parameters.prepend }

      // Only add the paths that are found on the system
      for (const desiredPath of parameters.paths) {
        if ((path.includes(desiredPath)) || path.includes(untildify(desiredPath))) {
          result.paths.push(desiredPath)
        }
      }

      return result;
    }

    return null;
  }

  async applyCreate(plan: CreatePlan<PathConfig>): Promise<void> {
    const { path, paths, prepend } = plan.desiredConfig;

    if (path) {
      // Escaping is done within file utils
      await FileUtils.addPathToZshrc(path, prepend);
      return;
    }

    if (paths) {
      for (const path of paths) {
        // Escaping is done within file utils
        await FileUtils.addPathToZshrc(path, prepend);
      }

    }
  }

  async applyModify(pc: ParameterChange<PathConfig>, plan: ModifyPlan<PathConfig>): Promise<void> {
    if (pc.name !== 'paths') {
      return;
    }

    const pathsToAdd = pc.newValue.filter((p: string) => !pc.previousValue.includes(p));

    // No deletes for now
    // const pathsToRemove = pc.previousValue.filter((p: string) => !pc.newValue.includes(p));

    for (const path of pathsToAdd) {
      // Escaping is done within file utils
      await FileUtils.addPathToZshrc(path, plan.desiredConfig.prepend);
    }
  }

  // TODO: Implement destroy some time in the future
  async applyDestroy(): Promise<void> {}

}
