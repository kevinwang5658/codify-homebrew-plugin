import { ParameterChange, Plan, Resource, ValidationResult } from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { codifySpawn, SpawnStatus } from '../../../utils/codify-spawn.js';
import { CSVCredentialsParameter } from './csv-credentials-parameter.js';

export interface AwsConfigureConfig extends StringIndexedObject {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  csvCredentials: string,
  metadataServiceNumAttempts?: number;
  metadataServiceTimeout?: number;
  output?: string;
  profile: string;
  region?: string;
}

export class AwsConfigureResource extends Resource<AwsConfigureConfig> {

  constructor() {
    super({
      dependencies: ['aws-cli'],
      parameterOptions: {
        awsAccessKeyId: { canModify: true },
        awsSecretAccessKey: { canModify: true },
        csvCredentials: { transformParameter: new CSVCredentialsParameter() },
        profile: { default: 'default' },
      },
      type: 'aws-configure',
    });
  }

  async validate(parameters: unknown): Promise<ValidationResult> {
    const p = parameters as Partial<AwsConfigureConfig>;
    if (p.csvCredentials && (p.awsAccessKeyId || p.awsSecretAccessKey)) {
      return {
        errors: ['Csv credentials cannot be added together with awsAccessKeyId or awsSecretAccessKey'],
        isValid: false,
      };
    }

    return {
      isValid: true,
    }
  }

  async refresh(keys: Map<string, any>): Promise<Partial<AwsConfigureConfig> | null> {
    const profile = keys.get('profile');

    // Make sure aws-cli is installed
    const { status: awsStatus } = await codifySpawn('which aws', { throws: false });
    if (awsStatus === SpawnStatus.ERROR) {
      return null;
    }

    // Check if the profile exists
    const { data: profiles } = await codifySpawn('aws configure list-profiles');
    if (!profiles.includes(profile)) {
      return null;
    }

    const awsAccessKeyId = await this.getAwsConfigureValueOrNull('aws_access_key_id', profile);
    const awsSecretAccessKey = await this.getAwsConfigureValueOrNull('aws_secret_access_key', profile);

    const result: Partial<AwsConfigureConfig> = {
      awsAccessKeyId: awsAccessKeyId ?? undefined,
      awsSecretAccessKey: awsSecretAccessKey ?? undefined,
      profile,
    };

    if (keys.has('region')) {
      result.region = await this.getAwsConfigureValueOrNull('region', profile);
    }

    if (keys.has('output')) {
      result.output = await this.getAwsConfigureValueOrNull('output', profile);
    }

    if (keys.has('metadataServiceTimeout')) {
      result.region = await this.getAwsConfigureValueOrNull('metadata_service_timeout', profile);
    }

    if (keys.has('metadataServiceNumAttempts')) {
      result.output = await this.getAwsConfigureValueOrNull('metadata_service_num_attempts', profile);
    }

    return result;
  }

  async applyCreate(plan: Plan<AwsConfigureConfig>): Promise<void> {
    // Assert that aws-cli is installed
    await codifySpawn('which aws')

    const {
      awsAccessKeyId,
      awsSecretAccessKey,
      metadataServiceNumAttempts,
      metadataServiceTimeout,
      output,
      profile,
      region
    } = plan.desiredConfig;

    await this.setAwsConfigureValue('aws_access_key_id', awsAccessKeyId, profile);
    await this.setAwsConfigureValue('aws_secret_access_key', awsSecretAccessKey, profile);

    if (region) {
      await this.setAwsConfigureValue('region', region, profile);
    }

    if (output) {
      await this.setAwsConfigureValue('output', output, profile);
    }

    if (metadataServiceTimeout) {
      await this.setAwsConfigureValue('metadata_service_timeout', metadataServiceTimeout, profile);
    }

    if (metadataServiceNumAttempts) {
      await this.setAwsConfigureValue('metadata_service_num_attempts', metadataServiceNumAttempts, profile);
    }
  }

  async applyModify(
    pc: ParameterChange<AwsConfigureConfig>,
    plan: Plan<AwsConfigureConfig>
  ): Promise<void> {
    if (pc.name === 'awsAccessKeyId') {
      await this.setAwsConfigureValue('aws_access_key_id', pc.newValue, plan.desiredConfig.profile);
    }

    if (pc.name === 'awsSecretAccessKey') {
      await this.setAwsConfigureValue('aws_secret_access_key', pc.newValue, plan.desiredConfig.profile);
    }
  }

  async applyDestroy(plan: Plan<AwsConfigureConfig>): Promise<void> {
    const regex = /^\[.*]$/g;
    const { profile } = plan.currentConfig;

    const credentialsPath = path.resolve(os.homedir(), '.aws/credentials');
    const credentialsFile = await fs.readFile(credentialsPath, 'utf8');
    const lines = credentialsFile.split('\n');

    const index = lines.indexOf(`[${plan.currentConfig.profile}]`)
    if (index === -1) {
      console.log(`Unable to find profile ${profile} in .aws/credentials. Skipping...`)
      return;
    }

    findAndDelete(lines, index + 1, 'aws_access_key_id');
    findAndDelete(lines, index + 1, 'aws_secret_access_key');

    await fs.writeFile(credentialsFile, lines.join('\n'));

    function findAndDelete(file: string[], startIdx: number, key: string) {
      let searchIdx = startIdx;

      while(searchIdx < file.length) {
        const line = file[searchIdx];
        if (line.includes(key)) {
          file.splice(searchIdx, 1);
          return;
        }

        if (regex.test(line)) {
          return;
        }

        searchIdx++;
      }
    }

  }

  private async getAwsConfigureValueOrNull(key: string, profile: string): Promise<string | undefined> {
    const { data, status } = await codifySpawn(`aws configure get ${key} --profile ${profile}`, { throws: false });
    if (status === SpawnStatus.ERROR) {
      return undefined;
    }

    return data.trim();
  }

  private async setAwsConfigureValue(key: string, value: number | string, profile: string): Promise<void> {
    await codifySpawn(`aws configure set ${key} ${value} --profile ${profile}`);
  }
}
