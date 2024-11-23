import { describe, expect, it } from 'vitest';
import { AwsProfileResource } from './aws-profile.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

describe('AWS profile validation tests', () => {
  it('Validates secret key id and secret key', async () => {
    const resource = new AwsProfileResource()

    const result = await resource.validate({
      awsAccessKeyId: 'abc',
      awsSecretAccessKey: 'def'
    }, {
      type: 'type',
      name: 'name'
    });

    expect(result).to.toMatchObject({
      isValid: true,
      schemaValidationErrors: [],
      resourceType: 'type',
      resourceName: 'name'
    })
  });

  it('Validates csv credentials', async () => {
    const resource = new AwsProfileResource()

    const result = await resource.validate({
      csvCredentials: '../../path/to/csv'
    }, {
      type: 'type',
      name: 'name'
    });

    expect(result).to.toMatchObject({
      isValid: true,
      schemaValidationErrors: [],
      resourceType: 'type',
      resourceName: 'name'
    })
  });

  it('Rejects both csv credentials and secrets', async () => {
    const resource = new AwsProfileResource()

    const result = await resource.validate({
      csvCredentials: '../../path/to/csv',
      awsAccessKeyId: 'abc',
      awsSecretAccessKey: 'def'
    }, {
      type: 'type',
      name: 'name'
    })

    expect(result).toMatchObject({
      isValid: false,
    })
  });

  it('Can separate a block in the credentials file', async () => {
    const credentialsPath = path.resolve(os.homedir(), '.aws', 'credentials');
    const credentialsFile = await fs.readFile(credentialsPath, 'utf8');
    const blocks = credentialsFile.split(/(?=\[.*\])/);

    console.log(JSON.stringify(blocks, null, 2));
  })
})
