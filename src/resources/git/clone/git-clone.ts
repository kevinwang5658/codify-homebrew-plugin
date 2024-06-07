import { CreatePlan, DestroyPlan, Resource, ValidationResult } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import path from 'node:path';
import { FileUtils } from '../../../utils/file-utils.js';
import Schema from './git-clone-schema.json';
import { codifySpawn } from '../../../utils/codify-spawn.js';
import { untildify } from '../../../utils/untildify.js';


export interface GitCloneConfig extends ResourceConfig {
  parentDirectory?: string,
  directory?: string,
  repository?: string,
  remote?: string,
}

export class GitCloneResource extends Resource<GitCloneConfig> {
  constructor() {
    super({
      type: 'git-clone',
      schema: Schema,
    });
  }

  async validate(parameters: Partial<GitCloneConfig>): Promise<ValidationResult> {
    if (parameters.parentDirectory && parameters.directory) {
      return {
        errors: ['Cannot specify both parentDirectory and directory together'],
        isValid: false,
      };
    }

    if (parameters.remote && parameters.repository) {
      return {
        errors: ['Cannot specify both remote and repository together'],
        isValid: false,
      };
    }

    return {
      isValid: true,
    }
  }

  async refresh(parameters: Partial<GitCloneConfig>): Promise<Partial<GitCloneConfig> | null> {
    const repositoryUrl = parameters.repository?? parameters.remote!;

    if (parameters.parentDirectory) {
      const parentDirectory = path.resolve(untildify(parameters.parentDirectory));

      const folderName = this.extractBasename(repositoryUrl);
      if (!folderName) {
        throw new Error('Invalid git repository or remote name. Un-able to parse');
      }

      const fullPath = path.join(parentDirectory, folderName);

      const exists = await FileUtils.checkDirExistsOrThrowIfFile(fullPath);
      if (!exists) {
        return null;
      }

      const { data: url } = await codifySpawn('git config --get remote.origin.url', { cwd: fullPath });
      if (this.extractBasename(url) !== folderName) {
        console.log(this.extractBasename(url))
        console.log(folderName)
        throw new Error(`Folder found at location: '${fullPath}'. However the remote url '${url}' repo does not match desired repo '${repositoryUrl}'`);
      }

      return parameters;
    }

    if (parameters.directory) {
      const directory = path.resolve(untildify(parameters.directory));

      const exists = await FileUtils.checkDirExistsOrThrowIfFile(directory);
      if (!exists) {
        return null;
      }

      const { data: url } = await codifySpawn('git config --get remote.origin.url', { cwd: directory });
      if (this.extractBasename(url) !== this.extractBasename(repositoryUrl)) {
        console.log(this.extractBasename(url))
        console.log(this.extractBasename(url))
        throw new Error(`Folder found at location: '${directory}'. However the remote url '${url}' does not match desired url '${repositoryUrl}'`);
      }

      return parameters;
    }

    throw new Error('Either directory or parent directory must be supplied');
  }

  async applyCreate(plan: CreatePlan<GitCloneConfig>): Promise<void> {
    const config = plan.desiredConfig;

    const repositoryUrl = config.repository ?? config.remote!;

    if (config.parentDirectory) {
      const parentDirectory = path.resolve(untildify(config.parentDirectory));
      await FileUtils.createDirIfNotExists(parentDirectory);

      console.log(`git clone ${repositoryUrl}`);
      await codifySpawn(`git clone ${repositoryUrl}`, { cwd: parentDirectory });
    } else {
      const directory = path.resolve(untildify(config.directory!));
      console.log(`git clone ${repositoryUrl} ${directory}`);

      await codifySpawn(`git clone ${repositoryUrl} ${directory}`);
    }
  }

  async applyDestroy(plan: DestroyPlan<GitCloneConfig>): Promise<void> {
    // Do nothing here. We don't want to destroy a user's repository.
  }

  // Converts https://github.com/kevinwang5658/codify-homebrew-plugin.git => codify-homebrew-plugin
  private extractBasename(name: string): string | undefined {
    return name
      .split('/')
      .at(-1)
      ?.replace('.git', '')
      ?.replace('/', '')
      ?.trim();
  }
}
