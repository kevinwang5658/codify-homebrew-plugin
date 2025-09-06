import { CreatePlan, DestroyPlan, Resource, ResourceSettings, getPty } from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { SpawnStatus, codifySpawn } from '../../utils/codify-spawn.js';
import { FileUtils } from '../../utils/file-utils.js';
import { Utils } from '../../utils/index.js';
import Schema from './docker-schema.json';

export interface DockerConfig extends StringIndexedObject {
  acceptLicense?: boolean;
  useCurrentUser?: boolean;
}

const ARM_DOWNLOAD_LINK = 'https://desktop.docker.com/mac/main/arm64/Docker.dmg'
const INTEL_DOWNLOAD_LINK = 'https://desktop.docker.com/mac/main/amd64/Docker.dmg'

export class DockerResource extends Resource<DockerConfig> {
  getSettings(): ResourceSettings<DockerConfig> {
    return {
      id: 'docker',
      schema: Schema,
      parameterSettings: {
        acceptLicense: {
          type: 'boolean',
          setting: true,
          default: true,
        },
        // version: {
        //   type: 'version'
        // },
        useCurrentUser: {
          type: 'boolean',
          setting: true,
          default: true,
        }
      }
    };
  }

  async refresh(): Promise<Partial<DockerConfig> | Partial<DockerConfig>[] | null> {
    const $ = getPty();

    const versionResult = await $.spawnSafe('docker --version');
    if (versionResult.status === SpawnStatus.ERROR) {
      return null;
    }

    const result: DockerConfig = {};

    // TODO: support versioning in the future
    // const version = /Docker version (.*), build/.exec(versionResult.data)?.[1];
    // if (version && parameters.version) {
    //   result.version = version;
    // }

    return result;
  }

  /**
   * References:
   * Blog about docker changes: https://dazwallace.wordpress.com/2022/12/02/changes-to-docker-desktop-for-mac/
   * Path: https://stackoverflow.com/questions/64009138/docker-command-not-found-when-running-on-mac
   * Issue: https://github.com/docker/for-mac/issues/6504
   * @param plan
   */
  async create(plan: CreatePlan<DockerConfig>): Promise<void> {
    const downloadLink = await Utils.isArmArch() ? ARM_DOWNLOAD_LINK : INTEL_DOWNLOAD_LINK;

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codify-docker'))
    await Utils.downloadUrlIntoFile(path.join(tmpDir, 'Docker.dmg'), downloadLink);
    const user = Utils.getUser();

    try {
      await codifySpawn('hdiutil attach Docker.dmg', { cwd: tmpDir, requiresRoot: true })

      console.log('Running Docker installer. This may take a couple of minutes to complete...')
      await codifySpawn(`/Volumes/Docker/Docker.app/Contents/MacOS/install ${plan.desiredConfig.acceptLicense ? '--accept-license' : ''} ${plan.desiredConfig.useCurrentUser ? `--user ${user}` : ''}`,
        { requiresRoot: true }
      )
      await codifySpawn('hdiutil detach /Volumes/Docker', { cwd: tmpDir, requiresRoot: true })
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }

    await codifySpawn('xattr -r -d com.apple.quarantine /Applications/Docker.app', { requiresRoot: true });
    await FileUtils.addPathToZshrc('/Applications/Docker.app/Contents/Resources/bin', false);
  }

  async destroy(plan: DestroyPlan<DockerConfig>): Promise<void> {
    await codifySpawn('/Applications/Docker.app/Contents/MacOS/uninstall', { throws: false })
    await fs.rm(path.join(os.homedir(), 'Library/Group\\ Containers/group.com.docker'), { recursive: true, force: true });
    await fs.rm(path.join(os.homedir(), 'Library/Containers/com.docker.docker/Data'), { recursive: true, force: true });
    await fs.rm(path.join(os.homedir(), '.docker'), { recursive: true, force: true });
    await codifySpawn('rm -rf /Applications/Docker.app', { requiresRoot: true })

    await FileUtils.removeLineFromZshrc('/Applications/Docker.app/Contents/Resources/bin')
  }

}
