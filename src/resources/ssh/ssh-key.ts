import { CreatePlan, DestroyPlan, ModifyPlan, ParameterChange, Resource, ResourceSettings } from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';
import path from 'node:path';

import { codifySpawn } from '../../utils/codify-spawn.js';
import { FileUtils } from '../../utils/file-utils.js';
import Schema from './ssh-key-schema.json';

export type SshKeyType = 'ecdsa' | 'ecdsa-sk' | 'ed25519' | 'ed25519-sk' | 'rsa';

export interface SshKeyConfig extends StringIndexedObject {
  keyType: SshKeyType;
  comment?: string;
  fileName: string;
  bits?: number;
  passphrase: string;
  folder: string;
}

const SSH_KEYGEN_FINGERPRINT_REGEX = /^(\d+) (.*):(.*) (.*) \((.*)\)$/

export class SshKeyResource extends Resource<SshKeyConfig> {
  getSettings(): ResourceSettings<SshKeyConfig> {
    return {
      id: 'ssh-key',
      schema: Schema,
      parameterSettings: {
        comment: { canModify: true },
        passphrase: { canModify: true },
        folder: { type: 'directory', default: '~/.ssh', canModify: true }
      },
      inputTransformation(input) {
        if (!input.keyType) {
          input.keyType = 'ed25519';
        }

        if (!input.fileName) {
          input.fileName = `id_${input.keyType}`;
        }

        return input;
      }
    }
  }

  override async refresh(parameters: Partial<SshKeyConfig>): Promise<Partial<SshKeyConfig> | null> {
    if (!(await FileUtils.dirExists(parameters.folder!))) {
      return null;
    }

    const keyPath = path.join(parameters.folder!, parameters.fileName!);
    if (!(await FileUtils.fileExists(keyPath))) {
      return null;
    }

    const { data: existingKey } = await codifySpawn(`ssh-keygen -l -f ${parameters.fileName}`, { cwd: parameters.folder! });
    const [_, bits, __, ___, comment, type] = existingKey
      .trim()
      .match(SSH_KEYGEN_FINGERPRINT_REGEX) ?? [];

    if (!bits || !type) {
      console.error(`Unable to parse ssh keygen output: ${_}`)
      return null;
    }

    const currentConfig: Partial<SshKeyConfig> = {
      fileName: parameters.fileName,
      passphrase: parameters.passphrase,
      folder: parameters.folder!,
    };

    if (parameters.bits) {
      currentConfig.bits = Number.parseInt(bits, 10);
    }

    if (parameters.keyType) {
      currentConfig.keyType = type.toLowerCase() as SshKeyType;
    }

    if (parameters.comment) {
      currentConfig.comment = comment;
    }

    return currentConfig;
  }

  override async create(plan: CreatePlan<SshKeyConfig>): Promise<void> {
    const command = [
      'ssh-keygen',
      `-f "${plan.desiredConfig.fileName}"`,
      `-t ${plan.desiredConfig.keyType}`,
      `-P "${plan.desiredConfig.passphrase}"`
    ]

    if (plan.desiredConfig.comment) {
      command.push(`-C "${plan.desiredConfig.comment}"`);
    }

    if (plan.desiredConfig.bits) {
      command.push(`-b ${plan.desiredConfig.bits}`);
    }

    await codifySpawn(command.join(' '), { cwd: plan.desiredConfig.folder })
  }

  override async modify(pc: ParameterChange<SshKeyConfig>, plan: ModifyPlan<SshKeyConfig>): Promise<void> {
    if (pc.name === 'comment') {
      await codifySpawn(`ssh-keygen -f ${plan.desiredConfig.fileName} -c -C "${pc.newValue}"`, { cwd: plan.desiredConfig.folder! })
      return;
    }
  }

  override async destroy(plan: DestroyPlan<SshKeyConfig>): Promise<void> {
    const keyPath = path.join(plan.currentConfig.folder!, plan.currentConfig.fileName!);

    await codifySpawn(`rm ${keyPath}`)
    await codifySpawn(`rm ${keyPath}.pub`)
  }
}
