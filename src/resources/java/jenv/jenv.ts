import { getPty, Resource, ResourceSettings, SpawnStatus } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import * as fs from 'node:fs';

import { codifySpawn } from '../../../utils/codify-spawn.js';
import { FileUtils } from '../../../utils/file-utils.js';
import { JenvGlobalParameter } from './global-parameter.js';
import {
  JAVA_VERSION_INTEGER,
  JenvAddParameter,
  OPENJDK_SUPPORTED_VERSIONS
} from './java-versions-parameter.js';
import Schema from './jenv-schema.json';

export interface JenvConfig extends ResourceConfig {
  add?: string[],
  global?: string,
}

export class JenvResource extends Resource<JenvConfig> {
  getSettings(): ResourceSettings<JenvConfig> {
    return {
      id: 'jenv',
      schema: Schema,
      dependencies: ['homebrew'],
      parameterSettings: {
        add: { type: 'stateful', definition: new JenvAddParameter(), order: 1 },
        global: { type: 'stateful', definition: new JenvGlobalParameter(), order: 2 },
      },
    };
  }

  override async validate(parameters: Partial<JenvConfig>): Promise<void> {
    if (parameters.add) {
      for (const version of parameters.add) {
        if (version.startsWith('/opt/homebrew/Cellar/openjdk@')) {
          const versionStr = version.split('/').at(4)?.split('@').at(1);

          if (!OPENJDK_SUPPORTED_VERSIONS.includes(Number.parseInt(versionStr!, 10))) {
            throw new Error(`Version must be one of [${OPENJDK_SUPPORTED_VERSIONS.join(', ')}]`)
          }

          continue;
        }

        if (!fs.existsSync(version)) {
          throw new Error(`Path does not exist. ${version} cannot be found on the file system`)
        }
      }
    }
  }

  override async refresh(): Promise<Partial<JenvConfig> | null> {
    const $ = getPty();

    const jenvQuery = await $.spawnSafe('which jenv')
    if (jenvQuery.status === SpawnStatus.ERROR) {
      return null
    }

    // For some reason jenv doctor will return with a non-zero status code even
    // if it's successful. We can ignore the status code and only check for the text
    const jenvDoctor = await $.spawnSafe('jenv doctor')
    if (jenvDoctor.data.includes('Jenv is not loaded in')) {
      return null
    }

    return {};
  }

  override async create(): Promise<void> {
    await this.assertBrewInstalled()

    const jenvQuery = await codifySpawn('which jenv', { throws: false })
    if (jenvQuery.status === SpawnStatus.ERROR) {
      await codifySpawn('brew install jenv')
    }

    const jenvDoctor = await codifySpawn('jenv doctor')
    if (jenvDoctor.data.includes('Jenv is not loaded in')) {
      await FileUtils.addToStartupFile('export PATH="$HOME/.jenv/bin:$PATH"')
      await FileUtils.addToStartupFile('eval "$(jenv init -)"')

      await codifySpawn('eval "$(jenv init -)"')
      await codifySpawn('jenv enable-plugin export')
    }
  }

  override async destroy(): Promise<void> {
    await codifySpawn('rm -rf $HOME/.jenv');

    await FileUtils.removeLineFromZshrc('export PATH="$HOME/.jenv/bin:$PATH"')
    await FileUtils.removeLineFromZshrc('eval "$(jenv init -)"')
  }

  private async assertBrewInstalled(): Promise<void> {
    const brewCheck = await codifySpawn('which brew', { throws: false });
    if (brewCheck.status === SpawnStatus.ERROR) {
      throw new Error(
        `Homebrew is not installed. Cannot install jenv without Homebrew installed.

Brew can be installed using Codify:
{
  "type": "homebrew",
}`
      );
    }
  }
}
