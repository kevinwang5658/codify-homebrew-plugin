import { ChangeSet, codifySpawn, ParameterChange, Resource, SpawnStatus } from 'codify-plugin-lib';
import { ResourceConfig, ResourceOperation } from 'codify-schemas';

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
    const homebrewInfo = await codifySpawn('brew config');
    if (homebrewInfo.status === SpawnStatus.SUCCESS) {
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
      await codifySpawn('xcode-select --install')
    }

    await codifySpawn('NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"')
    await codifySpawn('(echo; echo \'eval "$(/opt/homebrew/bin/brew shellenv)"\') >> /Users/$USER/.zprofile'); // TODO: may need to support non zsh shells here

    process.env['HOMEBREW_PREFIX'] = '/opt/homebrew';
    process.env['HOMEBREW_CELLAR'] = '/opt/homebrew/Cellar';
    process.env['HOMEBREW_REPOSITORY'] = '/opt/homebrew';
    process.env['PATH'] = `/opt/homebrew/bin:/opt/homebrew/sbin:${process.env['PATH'] ?? ''}`
    process.env['MANPATH'] = `/opt/homebrew/share/man${process.env['MANPATH'] ?? ''}:`
    process.env['INFOPATH'] = `/opt/homebrew/share/info:${process.env['INFOPATH'] ?? ''}`
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
    return xcodeSelectCheck.data ? parseInt(xcodeSelectCheck.data) === 0 : false;
  }
}
