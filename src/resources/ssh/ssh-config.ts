import {
  CreatePlan,
  DestroyPlan,
  ModifyPlan,
  ParameterChange,
  Resource,
  ResourceSettings
} from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';
import isEqual from 'lodash.isequal';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { codifySpawn } from '../../utils/codify-spawn.js';
import { FileUtils } from '../../utils/file-utils.js';
import Schema from './ssh-config-schema.json';

export interface SshConfigOptions {
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
}

export interface SshConfig extends StringIndexedObject {
  hosts: Array<Partial<SshConfigOptions>>;
}

const SSH_CONFIG_REGEX = /(?=Host\s)|(?=Match\s)/
const SSH_CONFIG_OPTION_REGEX = /(\S*)\s+(.*)/

export class SshConfigFileResource extends Resource<SshConfig> {

    getSettings(): ResourceSettings<SshConfig> {
      return {
        id: 'ssh-config',
        schema: Schema,
        parameterSettings: {
          hosts: {
            type: 'array',
            isElementEqual: 'object',
            canModify: true,
            filterInStatelessMode(desired, current) {
              return current.filter((c) => desired.some((d) => SshConfigFileResource.isHostObjectSame(c, d)))
            },
          }
        },
        inputTransformation(input) {
          const remappedOptionNames = input.hosts!.map((host) => Object.fromEntries(
              Object.entries(host)
                .map(([k, v]) => [
                  k,
                  typeof v === 'boolean'
                    ? (v ? 'yes' : 'no') // The file takes 'yes' or 'no' instead of booleans
                    : v,
                ])
            ))

          return {
            hosts: remappedOptionNames,
          };
        }
      }
    }

    async refresh(): Promise<Partial<SshConfig> | null> {
      const filePath = path.resolve(os.homedir(), '.ssh', 'config');

      if (!(await FileUtils.fileExists(filePath))) {
        return null;
      }

      const sshConfigFile = await fs.readFile(filePath, 'utf8');
      const hostBlocks = this.parseHostBlocks(sshConfigFile);
      const hostObjects = this.parseHostObjects(hostBlocks);

      return {
        hosts: hostObjects,
      }
    }

    async create(plan: CreatePlan<SshConfig>): Promise<void> {
      const folderPath = path.resolve(os.homedir(), '.ssh')
      const filePath = path.resolve(folderPath, 'config');

      if (!(await FileUtils.dirExists(folderPath))) {
        await codifySpawn('mkdir .ssh', { cwd: os.homedir() })
      }

      if (!(await FileUtils.fileExists(filePath))) {
        await codifySpawn('touch config', { cwd: folderPath })
      }

      const formattedConfigs = plan.desiredConfig.hosts
        .map((h) => this.hostObjectToString(h))

      await fs.writeFile(filePath, formattedConfigs.join('\n\n'), { encoding: 'utf8' });
    }

    async destroy(plan: DestroyPlan<SshConfig>): Promise<void> {
      // Prevent destroying config file for now
    }

    async modify(pc: ParameterChange<SshConfig>, plan: ModifyPlan<SshConfig>): Promise<void> {
      if (pc.name !== 'hosts') {
        return;
      }

      const filePath = path.resolve(os.homedir(), '.ssh', 'config');

      const valuesToAdd: Array<Partial<SshConfigOptions>> = pc.newValue.filter((v1) =>
        !pc.previousValue.some((v2) => SshConfigFileResource.isHostObjectSame(v1, v2))
      );

      const valuesToRemove: Array<Partial<SshConfigOptions>> = pc.previousValue.filter((v1) =>
        !pc.newValue.some((v2) => SshConfigFileResource.isHostObjectSame(v1, v2))
      );

      valuesToRemove.push(...pc.previousValue.filter((v1) =>
        pc.newValue.some((v2) => SshConfigFileResource.isHostObjectSame(v1, v2) && !isEqual(v1, v2))
      ));

      valuesToAdd.push(...pc.newValue.filter((v1) =>
        pc.previousValue.some((v2) => SshConfigFileResource.isHostObjectSame(v1, v2) && !isEqual(v1, v2))
      ));


      const sshConfigFile = await fs.readFile(filePath, 'utf8');
      const hostBlocks = this.parseHostBlocks(sshConfigFile);

      for (const value of valuesToRemove) {
        const index = hostBlocks.findIndex((b) => value.Host
            ? new RegExp('Host\\s*\\b' + value.Host + '\\b').test(b)
            : new RegExp('Match\\s*\\b' + value.Match + '\\b').test(b))

        if (index === -1) {
          continue;
        }

        hostBlocks.splice(index, 1);
      }

      for (const value of valuesToAdd) {
        hostBlocks.push('\n\n' + this.hostObjectToString(value));
      }

      await fs.writeFile(filePath, hostBlocks
          .filter(Boolean)
          .map((l) => l.trimEnd())
          .join(''),
        { encoding: 'utf8' }
      );
    }

    private parseHostBlocks(sshConfigFile: string): string[] {
      return sshConfigFile.split(SSH_CONFIG_REGEX)
        .filter(Boolean)
    }

    private parseHostObjects(hostBlocks: string[]): Array<Partial<SshConfigOptions>> {
      return hostBlocks
        .map((block) => {
          const options = block.split(/\n/)
            .filter(Boolean)
            .map((l) => l.trim())
            .map((l) => {
              const [_, option, value] = l.match(SSH_CONFIG_OPTION_REGEX) ?? [];
              if (!_ || !option || !value) {
                throw new Error(`Malformed .ssh/config file could not parse line: ${l}`)
              }

              return [option, value] as const;
            })

          return Object.fromEntries(options) as Partial<SshConfigOptions>;
        })
    }

    private hostObjectToString(h: Partial<SshConfigOptions>): string {
      const result = [];

      // Push host or match first. Either host or match is guaranteed to exist
      h.Host
        ? result.push(`Host ${h.Host}`)
        : result.push(`Match ${h.Match}`);

      const data = { ...h, Host: undefined, Match: undefined };
      Object.entries(data)
        .filter(([k, v]) => v !== undefined && v !== null)
        .forEach(([k, v]) => result.push(`  ${k} ${v}`))

      return result.join('\n');
    }

    static isHostObjectSame(h1: Partial<SshConfigOptions>, h2: Partial<SshConfigOptions>): boolean {
      if (h1.Host && h2.Host) {
        return h1.Host === h2.Host;
      }

      if (h1.Match && h2.Match) {
        return h1.Match === h2.Match;
      }

      return false;
    }
}
