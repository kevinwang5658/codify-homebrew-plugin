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
}

export interface SshConfig extends StringIndexedObject {
  hosts: Array<Partial<SshConfigOptions>>;
}

const SSH_CONFIG_REGEX = /(?=Host\s)|(?=Match\s)/
const SSH_CONFIG_OPTION_REGEX = /(.*) (.*)/

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
              return current.filter((c) => desired.some((d) => c.Host === d.Host))
            },
          }
        },
        inputTransformation(input) {
          const remappedOptionNames = input.hosts!.map((host) => Object.fromEntries(
              Object.entries(host)
                .map(([k, v]) => [
                  k,
                  k === 'Compression' || k === 'AddKeysToAgent' || k === 'UseKeychain'
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

      console.log('Refresh: ')
      console.log(JSON.stringify(hostObjects, null, 2));

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

      console.log('Modify: pc:')
      console.log(JSON.stringify(pc, null, 2));

      const filePath = path.resolve(os.homedir(), '.ssh', 'config');

      const valuesToAdd: Array<Partial<SshConfigOptions>> = pc.newValue.filter((v1) =>
        !pc.previousValue.some((v2) => v1.Host === v2.Host)
      );

      const valuesToRemove: Array<Partial<SshConfigOptions>> = pc.previousValue.filter((v1) =>
        !pc.newValue.some((v2) => v1.Host === v2.Host)
      );

      valuesToRemove.push(...pc.previousValue.filter((v1) =>
        pc.newValue.some((v2) => v1.Host === v2.Host && !isEqual(v1, v2))
      ));

      valuesToAdd.push(...pc.newValue.filter((v1) =>
        pc.previousValue.some((v2) => v1.Host === v2.Host && !isEqual(v1, v2))
      ));

      console.log('ValuesToAdd')
      console.log(JSON.stringify(valuesToAdd, null, 2));
      console.log('ValuesToRemove')
      console.log(JSON.stringify(valuesToRemove, null, 2));

      const sshConfigFile = await fs.readFile(filePath, 'utf8');
      const hostBlocks = this.parseHostBlocks(sshConfigFile);

      for (const value of valuesToRemove) {
        const index = hostBlocks.findIndex((b) => (new RegExp('Host[\\s]*' + value.Host)).test(b))
        if (index === -1) {
          continue;
        }

        hostBlocks.splice(index, 1);
      }

      for (const value of valuesToAdd) {
        hostBlocks.push('\n\n' + this.hostObjectToString(value));
      }

      console.log('HostBlocks:');
      console.log(JSON.stringify(hostBlocks, null, 2));

      await fs.writeFile(filePath, hostBlocks
          .filter(Boolean)
          .map((l) => l.trimEnd())
          .join(''),
        { encoding: 'utf8' }
      );

      console.log(await fs.readFile(filePath, 'utf8'));
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

      // Push host first. Host is guaranteed to exist
      result.push(`Host ${h.Host}`);

      const data = { ...h, Host: undefined };
      Object.entries(data)
        .filter(([k, v]) => v !== undefined && v !== null)
        .forEach(([k, v]) => result.push(`  ${k} ${v}`))

      return result.join('\n');
    }
}
