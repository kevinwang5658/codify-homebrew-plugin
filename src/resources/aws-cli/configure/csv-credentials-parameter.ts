import { TransformParameter } from 'codify-plugin-lib/dist/entities/transform-parameter.js';
import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import path from 'node:path';

import { untildify } from '../../../utils/untildify.js';
import { AwsConfigureConfig } from './aws-configure.js';

export class CSVCredentialsParameter extends TransformParameter<AwsConfigureConfig>{

  async transform(value: any): Promise<Partial<AwsConfigureConfig>> {
    const csvPath = path.resolve(untildify(value));

    if (!fsSync.existsSync(csvPath)) {
      throw new Error(`File ${csvPath} does not exist`);
    }

    const file = await fs.readFile(csvPath, 'utf8');

    const credentials = file.split('\n')?.[1]?.trim();
    if (!credentials) {
      throw new Error('AWS Credentials csv is malformed.');
    }

    const [awsAccessKeyId, awsSecretAccessKey] = credentials.split(',');
    if (!awsAccessKeyId || !awsSecretAccessKey) {
      throw new Error(`File ${csvPath} is not properly formatted. It must be a csv in the format: awsAccessKeyId, awsSecretAccessKey`);
    }

    return {
      awsAccessKeyId,
      awsSecretAccessKey,
    };
  }
}
