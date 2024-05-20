import { TransformParameter } from 'codify-plugin-lib/dist/entities/transform-parameter.js';
import { AwsConfigureConfig } from './aws-configure.js';
import { untildify } from '../../../utils/untildify.js';
import path from 'path';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';

export class CSVCredentialsParameter extends TransformParameter<AwsConfigureConfig>{

  async transform(value: any): Promise<Partial<AwsConfigureConfig>> {
    const csvPath = path.resolve(untildify(value));

    if (!fsSync.existsSync(csvPath)) {
      throw new Error(`File ${csvPath} does not exists`);
    }

    const file = await fs.readFile(csvPath, 'utf8');

    const credentials = file.split('\n')?.[1]?.trim();
    if (!credentials) {
      throw new Error('AWS Credentials csv is malformed.');
    }

    const [awsAccessKeyId, awsSecretAccessKey] = credentials.split(',');
    return {
      awsAccessKeyId,
      awsSecretAccessKey,
    };
  }
}
