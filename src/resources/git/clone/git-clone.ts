import { CreatePlan, Resource } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import path from 'node:path';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import { FileUtils } from '../../../utils/file-utils.js';
import { untildify } from '../../../utils/untildify.js';
import Schema from './git-clone-schema.json';


export interface GitCloneConfig extends ResourceConfig {
  autoVerifySSH: boolean
  directory?: string,
  parentDirectory?: string,
  remote?: string,
  repository?: string,
}

export class GitCloneResource extends Resource<GitCloneConfig> {
  constructor() {
    super({
      parameterOptions: {
        autoVerifySSH: { default: true },
      },
      schema: Schema,
      type: 'git-clone'
    });
  }

  override async customValidation(parameters: Partial<GitCloneConfig>): Promise<void> {
    if (parameters.parentDirectory && parameters.directory) {
      throw new Error('Cannot specify both parentDirectory and directory together')
    }

    if (parameters.remote && parameters.repository) {
      throw new Error('Cannot specify both remote and repository together')
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

    if (plan.desiredConfig.autoVerifySSH) {
      await this.autoVerifySSHForFirstAttempt(repositoryUrl)
    }

    if (config.parentDirectory) {
      const parentDirectory = path.resolve(untildify(config.parentDirectory));
      await FileUtils.createDirIfNotExists(parentDirectory);
      await codifySpawn(`git clone --progress ${repositoryUrl}`, { cwd: parentDirectory });
    } else {
      const directory = path.resolve(untildify(config.directory!));
      await codifySpawn(`git clone --progress ${repositoryUrl} ${directory}`);
    }
  }

  async applyDestroy(): Promise<void> {
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

  private async autoVerifySSHForFirstAttempt(url: string): Promise<void> {
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
    await codifySpawn('touch ~/.ssh/known_hosts', { throws: false })

    const baseUrl = groups!.url!
    const { data: existingKey } = await codifySpawn(`ssh-keygen -F ${baseUrl}`, { throws: false })
    console.log(`Is key blank: ${this.isBlank(existingKey)}`)
    if (!this.isBlank(existingKey)) {
      // An existing key is already in the file. Skipping..
      return;
    }

    // TODO: Add fingerprint verification here
    await codifySpawn(`ssh-keyscan ${baseUrl} >> ~/.ssh/known_hosts `)
  }

  isBlank(str: string): boolean {
    return (!str || /^\s*$/.test(str));
  }
}
