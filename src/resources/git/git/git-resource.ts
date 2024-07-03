import { CreatePlan, DestroyPlan, Resource } from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';

import { SpawnStatus, codifySpawn } from '../../../utils/codify-spawn.js';
import { GitEmailParameter } from './git-email-paramater.js';
import { GitNameParameter } from './git-name-parameter.js';

export interface GitConfig extends StringIndexedObject {
  email?: string,
  username?: string,
  // TODO: Allow upgrading git to the latest version in the future. This means installing git using homebrew
}

export class GitResource extends Resource<GitConfig> {
  constructor() {
    super({
      callStatefulParameterRemoveOnDestroy: true,
      parameterOptions: {
        email: { statefulParameter: new GitEmailParameter(), },
        username: { statefulParameter: new GitNameParameter() },
      },
      type: 'git'
    });
  }
  
  async refresh(): Promise<Partial<GitConfig> | null> {
    const { status } = await codifySpawn('which git', { throws: false })
    return status === SpawnStatus.ERROR ? null : {}
  }

  async applyCreate(): Promise<void> {
    // Git should always be installed with xcode tools. Nothing to do here.
  }

  async applyDestroy(): Promise<void> {
    // Don't uninstall git. It will break things.
  }
}
