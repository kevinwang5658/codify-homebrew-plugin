import { Resource } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';

import { SpawnStatus, codifySpawn } from '../../utils/codify-spawn.js';
import Schema from './android-studio-schema.json';

export interface AndroidCommandlineToolsConfig extends ResourceConfig {
  sdkManager: string[];

}

export class AndroidCommandlineToolsResource extends Resource<AndroidCommandlineToolsConfig> {
  constructor() {
    super({
      dependencies: ['homebrew'],
      schema: Schema,
      type: 'android-commandline-tools',
      parameterOptions: {
        // sdkManager: { statefulParameter: }
      }
    });
  }

  async refresh(): Promise<Partial<AndroidCommandlineToolsConfig> | null> {
    const { data: files } = await codifySpawn('ls /Applications');
    const { status: brewStatus } = await codifySpawn('brew list --cask -l android-commandlinetools', { throws: false });

    const applicationExists = files.split(/\n/).includes('Android Studio.app')
    if (applicationExists || (brewStatus !== SpawnStatus.ERROR)) {
      return {}
    }

    return null;
  }

  async applyCreate(): Promise<void> {
    const isBrewInstalled = await this.isBrewInstalled();
    if (isBrewInstalled) {
      await codifySpawn('brew install --cask android-studio');
      return;
    }

    throw new Error(`Unable to install android-studio because homebrew is not installed on the system.
    
Brew can be installed using Codify:
{
  "type": "homebrew",
}
    `)
  }

  async applyDestroy(): Promise<void> {
    const isBrewInstalled = await this.isBrewInstalled();
    if (!isBrewInstalled) {
      console.log('Unable to uninstall android-studio because homebrew is not installed');
      return;
    }

    await codifySpawn('brew uninstall android-studio');
  }

  private async isBrewInstalled(): Promise<boolean> {
    const brewCheck = await codifySpawn('which brew', { throws: false });
    return brewCheck.status === SpawnStatus.SUCCESS;
  }
}
