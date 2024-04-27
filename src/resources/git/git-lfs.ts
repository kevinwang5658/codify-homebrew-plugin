import { Plan, Resource, SpawnStatus, ValidationResult } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import { codifySpawn } from '../../utils/codify-spawn.js';

export interface GitLfsConfig extends ResourceConfig {
  // TODO: Add --system option for installing.
}

export class GitLfsResource extends Resource<GitLfsConfig> {

  constructor() {
    super({
      type: 'git-lfs',
      dependencies: ['homebrew'],
    });
  }

  // TODO: Update this method to have a more sane return type. No user is going to know the string[] is for errors.
  async validate(config: unknown): Promise<ValidationResult> {
    return {
      isValid: true,
    }
  }

  async refresh(keys: Set<keyof GitLfsConfig>): Promise<Partial<GitLfsConfig> | null> {
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
  async applyCreate(plan: Plan<GitLfsConfig>): Promise<void> {
    await this.assertBrewInstalled();

    const gitLfsCheck = await codifySpawn('git lfs', { throws: false });
    if (gitLfsCheck.status === SpawnStatus.ERROR) {
      await codifySpawn('brew install git-lfs');
    }

    await codifySpawn('git lfs install');
  }

  async applyDestroy(plan: Plan<GitLfsConfig>): Promise<void> {
    await this.assertBrewInstalled();

    await codifySpawn('git lfs uninstall');
    await codifySpawn('brew uninstall git-lfs');
  }

  private async checkIfGitLfsIsInstalled(): Promise<boolean> {
    const gitLfsStatus = await codifySpawn('git lfs env');

    const lines = gitLfsStatus.data.split('\n');
    const emptyLfsLines = lines.filter((l) => l.includes('git config'))
      .map((l) => l.split('=')[1].trim())
      .some((s) => s === '""');

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
