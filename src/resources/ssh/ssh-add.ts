import { CreatePlan, DestroyPlan, getPty, Resource, ResourceSettings } from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';
import path from 'node:path';

import { SpawnStatus, codifySpawn } from '../../utils/codify-spawn.js';
import { FileUtils } from '../../utils/file-utils.js';
import Schema from './ssh-add-schema.json'

export interface SshAddConfig extends StringIndexedObject {
  path: string;
  appleUseKeychain: boolean,
}

const APPLE_KEYCHAIN_REGEX = /Identity added: (.*) \((.*)\)/;

export class SshAddResource extends Resource<SshAddConfig> {
  getSettings(): ResourceSettings<SshAddConfig> {
    return {
      id: 'ssh-add',
      schema: Schema,
      parameterSettings: {
        path: {
          type: 'directory'
        },
        appleUseKeychain: {
          type: 'boolean'
        }
      },
      allowMultiple: {
        identifyingParameters: ['path']
      },
      dependencies: ['ssh-key', 'ssh-config']
    }
  }

  async refresh(parameters: Partial<SshAddConfig>): Promise<Partial<SshAddConfig> | null> {
    const $ = getPty();

    const sshPath = parameters.path!;
    if (!(await FileUtils.fileExists(sshPath))) {
      return null;
    }

    await $.spawnSafe('eval "$(ssh-agent -s)"')

    const { data: keyFingerprint, status: keygenStatus } = await $.spawnSafe(`ssh-keygen -lf ${sshPath}`);
    if (keygenStatus === SpawnStatus.ERROR) {
      return null;
    }

    const { data: loadedSshKeys, status: sshAddStatus } = await $.spawnSafe('/usr/bin/ssh-add -l');
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
      appleUseKeychain = await this.isKeyLoadedInKeychain(sshPath);
    }

    return {
      path: sshPath,
      appleUseKeychain,
    };
  }

  async create(plan: CreatePlan<SshAddConfig>): Promise<void> {
    const { appleUseKeychain, path } = plan.desiredConfig;

    await codifySpawn('eval "$(ssh-agent -s)"')
    await codifySpawn(`/usr/bin/ssh-add ${appleUseKeychain ? '--apple-use-keychain ' : ''}${path}`, { requestsTTY: true })
  }

  async destroy(plan: DestroyPlan<SshAddConfig>): Promise<void> {
    const { path } = plan.currentConfig;

    await codifySpawn('eval "$(ssh-agent -s)"')
    await codifySpawn(`/usr/bin/ssh-add -d ${path}`)
  }

  private async isKeyLoadedInKeychain(keyPath: string): Promise<boolean> {
    const { data: keychainKeys, status } = await codifySpawn('/usr/bin/ssh-add --apple-load-keychain', { throws: false });
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
