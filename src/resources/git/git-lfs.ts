import { ParameterChange, Plan, Resource, SpawnStatus } from 'codify-plugin-lib';
import { ResourceConfig, ResourceOperation } from 'codify-schemas';
import { codifySpawn } from '../../utils/codify-spawn.js';

export interface GitLfsConfig extends ResourceConfig {
  // TODO: Add --system option for installing.
}

export class GitLfsResource extends Resource<GitLfsConfig> {

    getTypeId(): string {
        return 'git-lfs';
    }

    // TODO: Update this method to have a more sane return type. No user is going to know the string[] is for errors.
    async validate(config: unknown): Promise<string[] | undefined> {
      return undefined;
    }

    // TODO: Fix this return type as well. Need to make sure to omit type, name and dependencies. No point of that here.
    async getCurrentConfig(desiredConfig: GitLfsConfig): Promise<GitLfsConfig | null> {
      const result = await codifySpawn('git lfs', { throws: false });
      if (result.status === SpawnStatus.ERROR) {
        return null;
      }

      if (!await this.checkIfGitLfsIsInstalled()) {
        return null;
      }

      return {
        type: 'git-lfs',
      };
    }

    // TODO: Maybe make this method optional and default to RECREATE
    calculateOperation(change: ParameterChange): ResourceOperation.MODIFY | ResourceOperation.RECREATE {
        return ResourceOperation.RECREATE;
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

    async applyModify(plan: Plan<GitLfsConfig>): Promise<void> {}

    async applyRecreate(plan: Plan<GitLfsConfig>): Promise<void> {}

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
