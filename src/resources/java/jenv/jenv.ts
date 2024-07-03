import { Resource, SpawnStatus } from 'codify-plugin-lib';
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
  constructor() {
    super({
      dependencies: ['homebrew'],
      parameterOptions: {
        add: { order: 1, statefulParameter: new JenvAddParameter() },
        global: { order: 2, statefulParameter: new JenvGlobalParameter() },
      },
      schema: Schema,
      type: 'jenv'
    });
  }

  async customValidation(parameters: Partial<JenvConfig>): Promise<void> {
    if (parameters.add) {
      for (const version of parameters.add) {
        if (JAVA_VERSION_INTEGER.test(version)) {
          if (!OPENJDK_SUPPORTED_VERSIONS.includes(Number.parseInt(version, 10))) {
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

  async refresh(): Promise<Partial<JenvConfig> | null> {
    const nvmQuery = await codifySpawn('which jenv', { throws: false })
    if (nvmQuery.status === SpawnStatus.ERROR) {
      return null
    }

    return {};
  }

  async applyCreate(): Promise<void> {
    await codifySpawn('git clone https://github.com/jenv/jenv.git ~/.jenv')

    await FileUtils.addToStartupFile('export PATH="$HOME/.jenv/bin:$PATH"')
    await FileUtils.addToStartupFile('eval "$(jenv init -)"')

    await codifySpawn('cat $HOME/.zshrc')
    await codifySpawn('jenv enable-plugin export')
  }

  async applyDestroy(): Promise<void> {
    await codifySpawn('rm -rf $HOME/.jenv');

    await FileUtils.removeLineFromZshrc('export PATH="$HOME/.jenv/bin:$PATH"')
    await FileUtils.removeLineFromZshrc('eval "$(jenv init -)"')
  }
}
