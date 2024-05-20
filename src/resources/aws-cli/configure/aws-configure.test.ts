import { describe, expect, it } from 'vitest';
import { AwsConfigureResource } from './aws-configure.js';

describe('AWS configure validation tests', () => {
  it('Validates secret key id and secret key', async () => {
    const resource = new AwsConfigureResource()

    const result = await resource.validate({
      awsAccessKeyId: 'abc',
      awsSecretAccessKey: 'def'
    });

    expect(result).to.toMatchObject({
      isValid: true,
      errors: undefined,
    })
  });

  it('Validates csv credentials', async () => {
    const resource = new AwsConfigureResource()

    const result = await resource.validate({
      csvCredentials: '../../path/to/csv'
    });

    expect(result).to.toMatchObject({
      isValid: true,
      errors: undefined,
    })
  });

  it('Rejects both csv credentials and secrets', async () => {
    const resource = new AwsConfigureResource()

    expect(async () => await resource.validate({
      csvCredentials: '../../path/to/csv',
      awsAccessKeyId: 'abc',
      awsSecretAccessKey: 'def'
    })).rejects.toThrow();
  });
})
