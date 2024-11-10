import { CreatePlan, DestroyPlan, Resource, ResourceSettings } from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';
import path from 'node:path';

import { SpawnStatus, codifySpawn } from '../../utils/codify-spawn.js';
import { FileUtils } from '../../utils/file-utils.js';
import Schema from './ssh-add-key-schema.json'

export interface SshAddConfig extends StringIndexedObject {
  path: string;
  appleUseKeychain: boolean,
}

const APPLE_KEYCHAIN_REGEX = /Identity added: (.*) \((.*)\)/;

export class SshAddKeyResource extends Resource<SshAddConfig> {
  getSettings(): ResourceSettings<SshAddConfig> {
    return {
      id: 'ssh-add-key',
      schema: Schema,
      parameterSettings: {
        path: {
          type: 'directory'
        },
        appleUseKeychain: {
          type: 'boolean'
        }
      },
      dependencies: ['ssh-key', 'ssh-config']
    }
  }

  async refresh(parameters: Partial<SshAddConfig>): Promise<Partial<SshAddConfig> | null> {
    const { data } = await codifySpawn('which ssh-add');
    if (data.trim() !== '/usr/bin/ssh-add') {
      throw new Error('Not using the default macOS ssh-add.')
    }

    const path = parameters.path!;
    if (!(await FileUtils.fileExists(path))) {
      return null;
    }

    await codifySpawn('eval "$(ssh-agent -s)"')

    const { data: keyFingerprint, status: keygenStatus } = await codifySpawn(`ssh-keygen -lf ${path}`, {  throws: false });
    if (keygenStatus === SpawnStatus.ERROR) {
      return null;
    }

    const { data: loadedSshKeys, status: sshAddStatus } = await codifySpawn('ssh-add -l', { throws: false });
    if (sshAddStatus === SpawnStatus.ERROR) {
      return null;
    }

    const matchedFingerprint = loadedSshKeys
      .trim()
      .split(/\n/)
      .filter(Boolean)
      .find((l) => l.trim() === keyFingerprint.trim());

    if (!matchedFingerprint) {
      return null;
    }
    
    let appleUseKeychain: boolean | undefined;
    if (parameters.appleUseKeychain) {
      appleUseKeychain = await this.isKeyLoadedInKeychain(path);
    }

    return {
      path,
      appleUseKeychain,
    };
  }

  async create(plan: CreatePlan<SshAddConfig>): Promise<void> {
    const { appleUseKeychain, path } = plan.desiredConfig;

    await codifySpawn('eval "$(ssh-agent -s)"')
    await codifySpawn(`ssh-add ${appleUseKeychain ? '--apple-use-keychain ' : ''}${path}`, { requestsTTY: true })
  }

  async destroy(plan: DestroyPlan<SshAddConfig>): Promise<void> {
    const { path } = plan.currentConfig;

    await codifySpawn('eval "$(ssh-agent -s)"')
    await codifySpawn(`ssh-add -d ${path}`)
  }

  private async isKeyLoadedInKeychain(keyPath: string): Promise<boolean> {
    const { data: keychainKeys, status } = await codifySpawn('ssh-add --apple-load-keychain', { throws: false });
    if (status === SpawnStatus.ERROR) {
      return false;
    }

    return keychainKeys.trim()
      .split(/\n/)
      .filter(Boolean)
      .map((l) => {
        const [line, path, comment] = l.trim().match(APPLE_KEYCHAIN_REGEX) ?? [];
        return { line, path, comment };
      })
      .some((result) => path.resolve(keyPath) === path.resolve(result.path))
  }

}
