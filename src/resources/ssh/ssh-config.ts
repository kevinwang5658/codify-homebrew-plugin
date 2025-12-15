import {
  Resource,
  ResourceSettings
} from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { codifySpawn } from '../../utils/codify-spawn.js';
import { FileUtils } from '../../utils/file-utils.js';
import { SshConfigHostsParameter } from './ssh-config-hosts-parameter.js';
import Schema from './ssh-config-schema.json';

export type SshConfigOptions = Partial<{
  Host: string;
  Match: string;
  HostName: string;
  User: string;
  Port: number;
  IdentityFile: string;
  LogLevel: string;
  Compression: boolean;
  PreferredAuthentications: string;
  AddKeysToAgent: boolean;
  UseKeychain: boolean;
  IgnoreUnknown: string;
  PasswordAuthentication: boolean;
}>

export interface SshConfig extends StringIndexedObject {
  hosts: Array<Partial<SshConfigOptions>>;
}

export class SshConfigFileResource extends Resource<SshConfig> {
  getSettings(): ResourceSettings<SshConfig> {
    return {
      id: 'ssh-config',
      schema: Schema,
      isSensitive: true,
      parameterSettings: {
        hosts: { type: 'stateful', definition: new SshConfigHostsParameter() }
      },
      importAndDestroy: {
        refreshKeys: ['hosts'],
        defaultRefreshValues: { hosts: [] },
        requiredParameters: []
      },
      dependencies: ['ssh-key']
    }
  }

  async refresh(): Promise<Partial<SshConfig> | null> {
    const filePath = path.resolve(os.homedir(), '.ssh', 'config');

    if (!(await FileUtils.fileExists(filePath))) {
      return null;
    }

    return {};
  }

  async create(): Promise<void> {
    const folderPath = path.resolve(os.homedir(), '.ssh')
    const filePath = path.resolve(folderPath, 'config');

    if (!(await FileUtils.dirExists(folderPath))) {
      await codifySpawn('mkdir .ssh', { cwd: os.homedir() })
      await codifySpawn('chmod 700 .ssh', { cwd: os.homedir() })
    }

    if (!(await FileUtils.fileExists(filePath))) {
      await codifySpawn('touch config', { cwd: folderPath })
      await codifySpawn('chmod 600 config', { cwd: folderPath })
    }
  }

  async destroy(): Promise<void> {
    const filePath = path.resolve(os.homedir(), '.ssh', 'config');
    const deletedFilePath = path.resolve(os.homedir(), '.ssh', 'config_deleted_by_codify');

    console.log('Destroyed ssh config: $HOME/.ssh/config was by renaming it to config_deleted_by_codify')
    await fs.rename(filePath, deletedFilePath);
  }
}
