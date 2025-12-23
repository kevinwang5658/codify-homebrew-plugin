import { CreatePlan, DestroyPlan, Resource, ResourceSettings, getPty } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import path from 'node:path';

import { FileUtils } from '../../../utils/file-utils.js';
import Schema from './git-repository-schema.json';

export interface GitCloneConfig extends ResourceConfig {
  autoVerifySSH: boolean
  directory?: string,
  parentDirectory?: string,
  repository: string,
}

export class GitCloneResource extends Resource<GitCloneConfig> {
  getSettings(): ResourceSettings<GitCloneConfig> {
    return {
      id: 'git-repository',
      schema: Schema,
      parameterSettings: {
        parentDirectory: { type: 'directory' },
        directory: { type: 'directory' },
        autoVerifySSH: { type: 'boolean', default: true, setting: true },
      },
      importAndDestroy:{
        requiredParameters: ['directory']
      },
      allowMultiple: {
        matcher: (desired, current) => {
          const desiredPath = desired.parentDirectory
            ? path.resolve(desired.parentDirectory, this.extractBasename(desired.repository!)!)
            : path.resolve(desired.directory!);

          const currentPath = current.parentDirectory
            ? path.resolve(current.parentDirectory, this.extractBasename(current.repository!)!)
            : path.resolve(current.directory!);

          const isNotCaseSensitive = process.platform === 'darwin';
          if (isNotCaseSensitive) {
            return desiredPath.toLowerCase() === currentPath.toLowerCase()
          }
 
          return desiredPath === currentPath;
        },
        findAllParameters: async () => {
          const $ = getPty();
          const { data } = await $.spawnSafe('find ~ -type d \\( -path $HOME/Library -o -path $HOME/Pictures -o -path $HOME/Utilities -o -path "$HOME/.*" \\) -prune -o -name .git -print')

          return data
              ?.split(/\n/)?.filter(Boolean)
              ?.map((p) => path.dirname(p))
              ?.map((directory) => ({ directory }))
            ?? [];
        }
      },
      dependencies: [
        'ssh-key',
        'ssh-add',
        'ssh-config',
        'wait-github-ssh-key'
      ]
    }
  }

  override async refresh(parameters: Partial<GitCloneConfig>): Promise<Partial<GitCloneConfig> | null> {
    const $ = getPty();

    if (parameters.parentDirectory) {
      const folderName = this.extractBasename(parameters.repository!);
      if (!folderName) {
        throw new Error('Invalid git repository or remote name. Un-able to parse');
      }

      const fullPath = path.join(parameters.parentDirectory, folderName);

      const exists = await FileUtils.checkDirExistsOrThrowIfFile(fullPath);
      if (!exists) {
        return null;
      }

      const { data: url } = await $.spawn('git config --get remote.origin.url', { cwd: fullPath });

      return {
        parentDirectory: parameters.parentDirectory,
        repository: url.trim(),
        autoVerifySSH: parameters.autoVerifySSH,
      }
    }

    if (parameters.directory) {
      const exists = await FileUtils.checkDirExistsOrThrowIfFile(parameters.directory);
      if (!exists) {
        return null;
      }

      const { data: url } = await $.spawn('git config --get remote.origin.url', { cwd: parameters.directory });

      return {
        directory: parameters.directory,
        repository: url.trim(),
        autoVerifySSH: parameters.autoVerifySSH,
      }
    }

    throw new Error('Either directory or parent directory must be supplied');
  }


  override async create(plan: CreatePlan<GitCloneConfig>): Promise<void> {
    const $ = getPty();
    const config = plan.desiredConfig;

    if (plan.desiredConfig.autoVerifySSH) {
      await this.autoVerifySSHForFirstAttempt(config.repository)
    }

    if (config.parentDirectory) {
      const parentDirectory = path.resolve(config.parentDirectory);
      await FileUtils.createDirIfNotExists(parentDirectory);
      await $.spawn(`git clone ${config.repository}`, { cwd: parentDirectory });
    } else {
      const directory = path.resolve(config.directory!);
      await $.spawn(`git clone ${config.repository} ${directory}`);
    }
  }

  override async destroy(plan: DestroyPlan<GitCloneConfig>): Promise<void> {
    // Do nothing here. We don't want to destroy a user's repository.
    // TODO: change this to skip the destroy only if the user's repo has pending changes (check via git)
    throw new Error(`The git-clone resource is not designed to delete folders. 
Please delete ${plan.currentConfig.directory ?? (plan.currentConfig.parentDirectory! + this.extractBasename(plan.currentConfig.repository))} manually and re-apply`);
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

  private async autoVerifySSHForFirstAttempt(url: string): Promise<void> {
    const $ = getPty();

    if (!(url.includes('@') || url.includes('ssh://'))) {
      // Not an ssh url
      return;
    }

    const baseUrlRegex = /(git)?@(?<url>[\w.]+)(:?(\/\/)?)([\w./:@~-]+)(\.git)(\/)?/gm
    const groups = baseUrlRegex.exec(url)?.groups
    if (!groups?.url) {
      // Was unable to extract base url
      console.log(`Un-able to extract base url from ssh ${url}. Skipping auto verification...`)
      return;
    }

    // Create known hosts file it doesn't exist
    await $.spawnSafe('touch ~/.ssh/known_hosts')

    const baseUrl = groups!.url!
    const { data: existingKey } = await $.spawnSafe(`ssh-keygen -F ${baseUrl}`)
    console.log(`Is key blank: ${this.isBlank(existingKey)}`)
    if (!this.isBlank(existingKey)) {
      // An existing key is already in the file. Skipping..
      return;
    }

    // TODO: Add fingerprint verification here
    await $.spawn(`ssh-keyscan ${baseUrl} >> ~/.ssh/known_hosts `)
  }

  isBlank(str: string): boolean {
    return (!str || /^\s*$/.test(str));
  }
}
