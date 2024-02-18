import { ChangeSet, codifySpawn, ParameterChange, Resource } from 'codify-plugin-lib';
import { ResourceConfig, ResourceOperation } from 'codify-schemas';
import { execSync } from 'child_process';

export interface HomebrewConfig extends ResourceConfig {
}

export class HomebrewMainResource extends Resource<HomebrewConfig> {

  getTypeId(): string {
    return 'homebrew';
  }

  calculateOperation(change: ParameterChange): ResourceOperation.MODIFY | ResourceOperation.RECREATE {
    return ResourceOperation.RECREATE
  }

  async getCurrentConfig(): Promise<HomebrewConfig | null> {
    const homebrewInfo = await codifySpawn('brew', ['config']);
    console.log(homebrewInfo);
    if (!homebrewInfo.stderr) {
      return {
        type: this.getTypeId()
      }
    }

    return null
  }

  async validate(config: HomebrewConfig): Promise<boolean> {
    return Promise.resolve(false);
  }

  async applyCreate(changeSet: ChangeSet): Promise<void> {
    if (!(await this.isXcodeSelectInstalled())) {
      console.log('Installing xcode select')
      await codifySpawn('xcode-select --install', [])
    }

    await codifySpawn('/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"', [])
  }

  async applyDestroy(changeSet: ChangeSet): Promise<void> {
    return Promise.resolve(undefined);
  }

  async applyModify(changeSet: ChangeSet): Promise<void> {
    return Promise.resolve(undefined);
  }

  async applyRecreate(changeSet: ChangeSet): Promise<void> {
    return Promise.resolve(undefined);
  }

  private async isXcodeSelectInstalled(): Promise<boolean> {
    // 2 if not installed 0 if installed
    const xcodeSelectCheck = await codifySpawn('xcode-select', ['-p', '1>/dev/null;echo', '$?'])
    return xcodeSelectCheck.stdout ? parseInt(xcodeSelectCheck.stdout) === 0 : false;
  }
}
