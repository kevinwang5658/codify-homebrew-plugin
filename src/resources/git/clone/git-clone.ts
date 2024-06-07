import { codifySpawn, CreatePlan, DestroyPlan, Resource } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import path from 'node:path';
import { FileUtils } from '../../../utils/file-utils.js';

export interface GitCloneConfig extends ResourceConfig {
  parentDirectory?: string,
  directory?: string,
  repository?: string,
  remote?: string,
}

export class GitCloneResource extends Resource<GitCloneConfig> {
  private readonly REPO_NAME_REGEX = /\/(.*)\.git\/?$/gm;

  constructor() {
    super({
      type: 'git-clone'
    });
  }

  async refresh(values: Map<keyof GitCloneConfig, unknown>): Promise<Partial<GitCloneConfig> | null> {
    const repositoryUrl = (values.get('repository') ?? values.get('remote')) as string;

    if (values.has('parentDirectory')) {
      const parentDirectory = values.get('parentDirectory') as string

      // Converts https://github.com/kevinwang5658/codify-homebrew-plugin.git => codify-homebrew-plugin
      const folderName = repositoryUrl
        .split('/')
        .at(-1)
        ?.replace('.git', '')
        ?.replace('/', '');

      if (!folderName) {
        throw new Error('Invalid git repository or remote name. Un-able to parse');
      }

      const fullPath = path.join(parentDirectory, folderName);

      const exists = await FileUtils.checkDirExistsOrThrowIfFile(fullPath);
      if (!exists) {
        return null;
      }

      const { data: url } = await codifySpawn('git config --get remote.origin.url', [], { cwd: fullPath });
      if (url !== repositoryUrl) {
        throw new Error(`Folder found at location: '${fullPath}'. However the remote url '${url}' does not match desired url '${repositoryUrl}'`);
      }

      return {
        parentDirectory: values.get('parentDirectory') as string,
        ...( values.has('remote') ? { remote: values.get('remote') as string | undefined } : {}),
        ...( values.has('repository') ? { repository: values.get('repository') as string | undefined } : {}),
      };
    }

    if (values.has('directory')) {
      const directory = values.get('directory') as string;

      const exists = await FileUtils.checkDirExistsOrThrowIfFile(directory);
      if (!exists) {
        return null;
      }

      const { data: url } = await codifySpawn('git config --get remote.origin.url', [], { cwd: directory });
      if (url !== repositoryUrl) {
        throw new Error(`Folder found at location: '${directory}'. However the remote url '${url}' does not match desired url '${repositoryUrl}'`);
      }

      return {
        directory: values.get('directory') as string,
        remote: values.get('remote') as string | undefined,
        repository: values.get('repository') as string | undefined,
      };
    }

    throw new Error('Either directory or parent directory must be supplied');
  }

  async applyCreate(plan: CreatePlan<GitCloneConfig>): Promise<void> {
    const config = plan.desiredConfig;

    const repositoryUrl = config.repository ?? config.remote!;

    if (config.parentDirectory) {
      await FileUtils.createDirIfNotExists(config.parentDirectory);

      await codifySpawn(`git clone ${repositoryUrl}`, [], { cwd: config.parentDirectory });
    } else {
      await codifySpawn(`git clone ${repositoryUrl} ${config.directory}`);
    }
  }

  async applyDestroy(plan: DestroyPlan<GitCloneConfig>): Promise<void> {
    // Do nothing here. We don't want to destroy a user's repository.
  }
}
