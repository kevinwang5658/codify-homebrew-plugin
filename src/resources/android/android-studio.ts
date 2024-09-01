import { Resource } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';

import { SpawnStatus, codifySpawn } from '../../utils/codify-spawn.js';
import Schema from './android-studio-schema.json';
import { AndroidStudioVersionData, JetbrainsAndroidStudiosResponse } from './types.js';

export interface AndroidStudioConfig extends ResourceConfig {}

export class AndroidStudioResource extends Resource<AndroidStudioConfig> {
  constructor() {
    super({
      dependencies: ['homebrew'],
      schema: Schema,
      type: 'android-studio',
    });
  }

  async refresh(): Promise<Partial<AndroidStudioConfig> | null> {
    const versions = await this.fetchAndroidStudioVersions();

    const { data: files } = await codifySpawn('ls /Applications');
    const { status: brewStatus } = await codifySpawn('brew list --cask -l android-studio', { throws: false });

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

  async fetchAndroidStudioVersions(): Promise<AndroidStudioVersionData[]> {
    const res = await fetch('https://jb.gg/android-studio-releases-list.json')

    if (!res.ok) {
      throw new Error('Unable to fetch android-studio-releases-list at https://jb.gg/android-studio-releases-list.json');
    }

    return JSON.parse(await res.text()).content.item
  }
}
