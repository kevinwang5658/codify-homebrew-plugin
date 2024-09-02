import { CreatePlan, Resource } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import * as fs from 'node:fs';
import path from 'node:path';
import plist from 'plist';

import { codifySpawn } from '../../utils/codify-spawn.js';
import { Utils } from '../../utils/index.js';
import Schema from './android-studio-schema.json';
import { AndroidStudioPlist, AndroidStudioVersionData } from './types.js';

export interface AndroidStudioConfig extends ResourceConfig {
  version?: string;
  directory?: string;
}

export class AndroidStudioResource extends Resource<AndroidStudioConfig> {

  allAndroidStudioVersions?: AndroidStudioVersionData[];

  constructor() {
    super({
      dependencies: ['homebrew'],
      schema: Schema,
      type: 'android-studio',
    });
  }

  async refresh(parameters: Partial<AndroidStudioConfig>): Promise<Partial<AndroidStudioConfig> | null> {
    const installedVersions = (await Utils.findApplication('Android Studio')
      .then((locations) => Promise.all(
        locations.map((l) => this.addPlistData(l))
      )))
      .filter(Boolean)
      .map((l) => l!)

    const match = this.matchVersionAndDirectory(parameters, installedVersions);
    if (match) {
      return match;
    }

    // Attempt to fetch all versions. The plist doesn't give detailed info on the version
    this.allAndroidStudioVersions = await this.fetchAllAndroidStudioVersions()

    // Attempt to match with the additional information form the web.
    const secondaryMatch = this.matchVersionAndDirectory(
      parameters,
      installedVersions.map(
        (installed) => this.addWebInfo(installed, this.allAndroidStudioVersions!)
      )
    )

    if (secondaryMatch) {
      return secondaryMatch;
    }

    return null;
  }

  async applyCreate(plan: CreatePlan<AndroidStudioConfig>): Promise<void> {
    if (!this.allAndroidStudioVersions) {
      this.allAndroidStudioVersions = await this.fetchAllAndroidStudioVersions()
    }

    const versionToDownload = this.getVersionData(plan.desiredConfig.version, this.allAndroidStudioVersions)
    if (!versionToDownload) {
      throw new Error(`Unable to find desired version: ${plan.desiredConfig.version}`);
    }

    const downloadLink = await Utils.isArmArch()
      ? versionToDownload.download.find((v) => v.link.includes('mac_arm.dmg'))!
      : versionToDownload.download.find((v) => v.link.includes('mac.dmg'))!

    // Create a temporary tmp dir
    const temporaryDirQuery = await codifySpawn('mktemp -d');
    const temporaryDir = temporaryDirQuery.data.trim();

    // Download and unzip the terraform binary
    await codifySpawn(`curl -fsSL ${downloadLink.link} -o android-studio.dmg`, { cwd: temporaryDir });

    const { data } = await codifySpawn('hdiutil attach android-studio.dmg', { cwd: temporaryDir });
    const mountedDir = data.split(/\n/)
      .find((l) => l.includes('/Volumes/'))
      ?.split('                 ')
      ?.at(-1)
      ?.trim()

    if (!mountedDir) {
      throw new Error('Unable to mount dmg or find the mounted volume')
    }

    const { data: contents } = await codifySpawn('ls', { cwd: mountedDir })

    // Depending on it's preview or regular the name is different
    const appName = contents.split(/\n/)
      .find((l) => l.includes('Android'))

    await codifySpawn(`rsync -rl "${appName}" Applications/`, { cwd: mountedDir })

    // Unmount
    await codifySpawn(`hdiutil detach "${mountedDir}"`)
    await codifySpawn(`rm -r ${temporaryDir}`)
  }

  async applyDestroy(): Promise<void> {
    await codifySpawn('rm -r /Applications/Android Studio.app')
  }

  async fetchAllAndroidStudioVersions(): Promise<AndroidStudioVersionData[]> {
    const res = await fetch('https://jb.gg/android-studio-releases-list.json')

    if (!res.ok) {
      throw new Error('Unable to fetch android-studio-releases-list at https://jb.gg/android-studio-releases-list.json');
    }

    return JSON.parse(await res.text()).content.item
  }

  async addPlistData(location: string): Promise<{ location: string, plist: AndroidStudioPlist } | null> {
    try {
      const file = fs.readFileSync(path.join(location, '/Contents/Info.plist'), 'utf8');
      const plistData = plist.parse(file) as unknown as AndroidStudioPlist;

      return { location, plist: plistData };
    } catch(error) {
      console.log(error)
      return null;
    }
  }

  addWebInfo(
    installed: { location: string; plist: AndroidStudioPlist },
    allWebInfo: AndroidStudioVersionData[],
  ): { location: string, plist: AndroidStudioPlist, webInfo: AndroidStudioVersionData } {
    const webInfo = allWebInfo!.find((all) =>
      all.platformVersion === installed.plist.CFBundleVersion
    )!

    return { ...installed, webInfo }
  }

  matchVersionAndDirectory(
    parameters: Partial<AndroidStudioConfig>,
    installedVersions: Array<{ location: string; plist: AndroidStudioPlist; webInfo?: AndroidStudioVersionData }>
  ): Partial<AndroidStudioConfig> | null {
    if (installedVersions.length === 0) {
      return null;
    }

    const matchedVersions = installedVersions
      .filter(({ plist, webInfo }) =>
        !parameters.version
        || plist.CFBundleShortVersionString.includes(parameters.version)
        || (webInfo && (webInfo.platformVersion.includes(parameters.version)))
      ).filter(({ location }) =>
        !parameters.directory || parameters.directory === path.dirname(location)
      )

    return matchedVersions.length > 0
      ? parameters
      : null;
  }

  getVersionData(
    version: string | undefined,
    allVersionData: AndroidStudioVersionData[],
  ): AndroidStudioVersionData | null {
    if (!version) {
      // Return the latest release build if version is not specified
      return allVersionData.find((d) => d.channel === 'Release')!
    }

    return allVersionData.find((d) => d.platformVersion.includes(version)) ?? null
  }
}
