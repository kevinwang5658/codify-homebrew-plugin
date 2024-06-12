import { StringIndexedObject } from 'codify-schemas';
import { CreatePlan, DestroyPlan, Resource } from 'codify-plugin-lib';
import { codifySpawn } from '../../../utils/codify-spawn.js';
import { FileUtils } from '../../../utils/file-utils.js';

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
      }
    });
  }

  async refresh(parameters: Partial<PathConfig>): Promise<Partial<PathConfig> | null> {
    const { data: path } = await codifySpawn('echo $PATH')

    if (parameters.path && path.includes(parameters.path)) {
      return parameters;
    }

    if (parameters.paths && parameters.paths.every(((p) => path.includes(p)))) {
      return parameters;
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

  // TODO: Implement destroy some time in the future
  async applyDestroy(plan: DestroyPlan<PathConfig>): Promise<void> {}

}
