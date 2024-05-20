import { Plan, Resource, ValidationResult } from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';
import { codifySpawn, SpawnStatus } from '../../../utils/codify-spawn.js';
import Ajv2020 from 'ajv/dist/2020.js';
import Schema from './aws-configure-schema.json';
import { CSVCredentialsParameter } from './csv-credentials-parameter.js';

export interface AwsConfigureConfig extends StringIndexedObject {
  profile: string;
  csvCredentials: string,
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  region?: string;
  output?: string;
  metadataServiceTimeout?: number;
  metadataServiceNumAttempts?: number;
}

export class AwsConfigureResource extends Resource<AwsConfigureConfig> {

  constructor() {
    super({
      type: 'aws-configure',
      dependencies: ['aws-cli'],
      transformParameters: {
        csvCredentials: new CSVCredentialsParameter(),
      },
      parameterConfigurations: {
        profile: { defaultValue: 'default' },
      }
    });
  }

  async validate(parameters: unknown): Promise<ValidationResult> {
    const ajv = new Ajv2020.default({
      strict: true,
      strictRequired: false,
    })
    const validator = ajv.compile(Schema);
    const isValid = validator(parameters)

    const p = parameters as Partial<AwsConfigureConfig>;
    if (p.csvCredentials && (p.awsAccessKeyId || p.awsSecretAccessKey)) {
      throw new Error('Csv credentials cannot be added together with awsAccessKeyId or awsSecretAccessKey');
    }

    return {
      isValid,
      errors: validator.errors ?? undefined,
    }
  }

  async refresh(keys: Map<string, any>): Promise<Partial<AwsConfigureConfig> | null> {
    const profile = keys.get('profile');

    // Make sure aws-cli is installed
    const { status: awsStatus} = await codifySpawn('which aws', { throws: false });
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
      profile,
      awsAccessKeyId: awsAccessKeyId ?? undefined,
      awsSecretAccessKey: awsSecretAccessKey ?? undefined,
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
      profile,
      awsAccessKeyId,
      awsSecretAccessKey,
      region,
      output,
      metadataServiceTimeout,
      metadataServiceNumAttempts
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
  applyDestroy(plan: Plan<AwsConfigureConfig>): Promise<void> {
    throw new Error('Method not implemented.');
  }

  private async getAwsConfigureValueOrNull(key: string, profile: string): Promise<string | undefined> {
    const { status, data } = await codifySpawn(`aws configure get ${key} --profile ${profile}`, { throws: false });
    if (status === SpawnStatus.ERROR) {
      return undefined;
    }

    return data.trim();
  }

  private async setAwsConfigureValue(key: string, value: string | number, profile: string): Promise<void> {
    await codifySpawn(`aws configure set ${key} ${value} --profile ${profile}`);
  }
}
