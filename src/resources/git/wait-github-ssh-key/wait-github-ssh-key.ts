import {
  CodifyCliSender,
  Resource,
  ResourceSettings,
  getPty
} from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';

import { codifySpawn } from '../../../utils/codify-spawn.js';

export interface WaitGithubSshKeyConfig extends ResourceConfig {}

export class WaitGithubSshKey extends Resource<WaitGithubSshKeyConfig> {
  getSettings(): ResourceSettings<WaitGithubSshKeyConfig> {
    return {
      id: 'wait-github-ssh-key',
    }
  }

  async refresh(): Promise<Partial<WaitGithubSshKeyConfig> | null> {
    const pty = getPty()

    const { data: githubConnectionStatus } = await pty.spawnSafe('ssh -o StrictHostKeychecking=no -T git@github.com 2>&1')
    if (githubConnectionStatus.includes('You\'ve successfully authenticated, but GitHub does not provide shell access.')) {
      return {};
    }

    return null;
  }

  async create(): Promise<void> {
    let attemptCount = 0;

    do {
      if (attemptCount > 0) {
        console.error('Unable to verify that github ssh access is connected.')
      }

      await CodifyCliSender.requestPressKeyToContinuePrompt(
        (attemptCount > 0 ? 'Unable to verify that github ssh access is connected. Please try again. \n\n' : '') +
        'Waiting for user to add ssh-key to github. For instructions please follow: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account.')
      attemptCount++;
    } while(!(await this.isConnectedToGithub()));
  }

  async destroy(): Promise<void> {
    console.error('This resource cannot be destroyed. Skipping.')
  }

  private async isConnectedToGithub(): Promise<boolean> {
    const { data: githubConnectionStatus } = await codifySpawn('ssh -o StrictHostKeychecking=no -T git@github.com 2>&1', { throws: false })
    return githubConnectionStatus.includes('You\'ve successfully authenticated, but GitHub does not provide shell access.')
  }
}
