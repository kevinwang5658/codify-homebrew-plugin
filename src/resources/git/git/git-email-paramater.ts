import { StatefulParameter } from 'codify-plugin-lib';

import { SpawnStatus, codifySpawn } from '../../../utils/codify-spawn.js';
import { GitConfig } from './git-resource.js';

export class GitEmailParameter extends StatefulParameter<GitConfig, string> {

    async refresh(): Promise<null | string> {
      const { data: email, status } = await codifySpawn('git config --global user.email', { throws: false })

      return status === SpawnStatus.ERROR ? null : email.trim()
    }

    async add(valueToAdd: string): Promise<void> {
      await codifySpawn(`git config --global user.email "${valueToAdd}"`)
    }

    async modify(newValue: string): Promise<void> {
      await codifySpawn(`git config --global user.email "${newValue}"`)
    }

    async remove(): Promise<void> {
      await codifySpawn('git config --global --unset user.email')
    }
}
