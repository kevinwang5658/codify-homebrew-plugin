import { Resource, ResourceSettings, SpawnStatus } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import * as os from 'node:os';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import Schema from './git-lfs-schema.json';

export interface GitLfsConfig extends ResourceConfig {
  // TODO: Add --system option for installing.
}

export class GitLfsResource extends Resource<GitLfsConfig> {
  getSettings(): ResourceSettings<GitLfsConfig> {
    return {
      id: 'git-lfs',
      schema: Schema,
      dependencies: ['homebrew'],
    }
  }

  override async refresh(): Promise<Partial<GitLfsConfig> | null> {
    const result = await codifySpawn('git lfs', { throws: false });

    if (result.status === SpawnStatus.ERROR) {
      return null;
    }

    if (!await this.checkIfGitLfsIsInstalled()) {
      return null;
    }

    return {}
  }

  // FYI: This create might be called if git-lfs is installed but not initialized.
  override async create(): Promise<void> {
    await this.assertBrewInstalled();

    const gitLfsCheck = await codifySpawn('git lfs', { throws: false });
    if (gitLfsCheck.status === SpawnStatus.ERROR) {
      await codifySpawn('brew install git-lfs');
    }

    await codifySpawn('git lfs install', { cwd: os.homedir() });
  }

  override async destroy(): Promise<void> {
    await this.assertBrewInstalled();

    await codifySpawn('git lfs uninstall', { cwd: os.homedir() });
    await codifySpawn('brew uninstall git-lfs');
  }

  private async checkIfGitLfsIsInstalled(): Promise<boolean> {
    const gitLfsStatus = await codifySpawn('git lfs env', { cwd: os.homedir() });

    const lines = gitLfsStatus.data.split('\n');

    // When git lfs exists but git lfs install hasn't been called then git lfs env returns:
    // git config filter.lfs.process = ""
    // git config filter.lfs.smudge = ""
    // git config filter.lfs.clean = ""
    const emptyLfsLines = lines.filter((l) => l.includes('git config filter.lfs'))
      .map((l) => l.split('=')[1].trim())
      .includes('""');

    return !emptyLfsLines;
  }

  private async assertBrewInstalled(): Promise<void> {
    const brewCheck = await codifySpawn('which brew', { throws: false });
    if (brewCheck.status === SpawnStatus.ERROR) {
      throw new Error(
        `Homebrew is not installed. Cannot install git-lfs without Homebrew installed.

Brew can be installed using Codify:
{
  "type": "homebrew",
}`
      );
    }
  }
}
