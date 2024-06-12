import { StringIndexedObject } from 'codify-schemas';
import { CreatePlan, DestroyPlan, ModifyPlan, ParameterChange, Resource, ValidationResult } from 'codify-plugin-lib';
import { codifySpawn } from '../../../utils/codify-spawn.js';
import { FileUtils } from '../../../utils/file-utils.js';
import Schema from './path-schema.json';

export interface PathConfig extends StringIndexedObject {
  path: string;
  paths: string[];
  prepend: boolean;
}

export class PathResource extends Resource<PathConfig> {
  constructor() {
    super({
      type: 'path',
      parameterOptions: {
        prepend: { default: false },
        paths: { modifyOnChange: true }
      },
      schema: Schema
    });
  }

  override async validate(parameters: Partial<PathConfig>): Promise<ValidationResult> {
    if (parameters.path && parameters.paths) {
      return {
        isValid: false,
        errors: ['Both path and paths cannot be specified together']
      }
    }

    return {
      isValid: true,
      errors: []
    }
  }

  async refresh(parameters: Partial<PathConfig>): Promise<Partial<PathConfig> | null> {
    const { data: path } = await codifySpawn('echo $PATH')

    if (parameters.path && path.includes(parameters.path)) {
      return parameters;
    }

    if (parameters.paths && parameters.paths.some((desired) => path.includes(desired))) {
      const result = { prepend: parameters.prepend, paths: [] as string[] }

      // Only add the paths that are found on the system
      parameters.paths.forEach(desiredPath => {
        if (path.includes(desiredPath)) {
          result.paths.push(desiredPath)
        }
      })

      return result;
    }

    return null;
  }

  async applyCreate(plan: CreatePlan<PathConfig>): Promise<void> {
    const { path, paths, prepend } = plan.desiredConfig;

    if (path) {
      await FileUtils.addPathToZshrc(path, prepend);
      return;
    }

    if (paths) {
      for (const path of paths) {
        await FileUtils.addPathToZshrc(path, prepend);
      }
      return;
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
      await FileUtils.addPathToZshrc(path, plan.desiredConfig.prepend);
    }
  }

  // TODO: Implement destroy some time in the future
  async applyDestroy(plan: DestroyPlan<PathConfig>): Promise<void> {}

}
