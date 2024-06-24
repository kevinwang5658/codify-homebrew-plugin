import { describe, expect, it } from 'vitest';
import { AwsConfigureResource } from './aws-configure.js';

describe('AWS configure validation tests', () => {
  it('Validates secret key id and secret key', async () => {
    const resource = new AwsConfigureResource()

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
    const resource = new AwsConfigureResource()

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
    const resource = new AwsConfigureResource()

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
})
