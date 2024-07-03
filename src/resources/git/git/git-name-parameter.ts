import { StatefulParameter } from 'codify-plugin-lib';

import { SpawnStatus, codifySpawn } from '../../../utils/codify-spawn.js';
import { GitConfig } from './git-resource.js';

export class GitNameParameter extends StatefulParameter<GitConfig, string> {

  async refresh(): Promise<null | string> {
    const { data: email, status } = await codifySpawn('git config --global user.name', { throws: false })

    return status === SpawnStatus.ERROR ? null : email.trim()
  }

  async applyAdd(valueToAdd: string): Promise<void> {
    await codifySpawn(`git config --global user.name "${valueToAdd}"`)
  }

  async applyModify(newValue: string): Promise<void> {
    await codifySpawn(`git config --global user.name "${newValue}"`)
  }

  async applyRemove(): Promise<void> {
    await codifySpawn('git config --global --unset user.name')
  }
}
