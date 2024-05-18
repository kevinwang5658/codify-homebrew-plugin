import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestResourceIPC } from '../../src/utils/test-utils.js';
import { AwsCliConfig } from '../../src/resources/aws-cli/cli/aws-cli.js';
import { MessageStatus, ResourceOperation } from 'codify-schemas';
import { HomebrewConfig } from '../../src/resources/homebrew/homebrew.js';

describe('Test aws-cli', async () => {
  let homebrew: TestResourceIPC<HomebrewConfig>;
  let resource: TestResourceIPC<AwsCliConfig>;

  beforeEach(() => {
    resource = new TestResourceIPC<AwsCliConfig>();
  })

  it('Can add a aws-cli profile', { timeout: 300000 }, async () => {
    const brewPlan = await resource.plan({
      type: 'homebrew',
    })

    const awsPlan = await resource.plan({
      type: 'aws-cli',
    })

    const awsConfigurePlan = await resource.plan({
      type: 'aws-configure',
      awsAccessKeyId: 'keyId',
      awsSecretAccessKey: 'secretAccessKey',
      region: 'us-west-2',
      output: 'json'
    })

    expect(brewPlan).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.CREATE,
      }
    });

    expect(awsPlan).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.CREATE,
      }
    });

    expect(awsConfigurePlan).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.CREATE,
      }
    });

    expect(await resource.apply({ planId: brewPlan.data.planId })).toMatchObject({
      status: MessageStatus.SUCCESS,
    })

    expect(await resource.apply({ planId: awsPlan.data.planId })).toMatchObject({
      status: MessageStatus.SUCCESS,
    })

    expect(await resource.apply({ planId: awsConfigurePlan.data.planId })).toMatchObject({
      status: MessageStatus.SUCCESS,
    })

    expect(await resource.plan({
      type: 'aws-configure',
      awsAccessKeyId: 'keyId',
      awsSecretAccessKey: 'secretAccessKey',
      region: 'us-west-2',
      output: 'json'
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.NOOP,
      }
    })
  })

  it('Can add custom profiles', async () => {
    const plan = await resource.plan({
      type: 'aws-configure',
      profile: 'codify',
      awsAccessKeyId: 'keyId',
      awsSecretAccessKey: 'secretAccessKey',
    })

    expect(plan).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.CREATE,
      }
    });

    expect(await resource.apply({ planId: plan.data.planId })).toMatchObject({
      status: MessageStatus.SUCCESS,
    })

    expect(await resource.plan({
      type: 'aws-configure',
      profile: 'codify',
      awsAccessKeyId: 'keyId',
      awsSecretAccessKey: 'secretAccessKey',
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.NOOP,
      }
    })
  })


  afterEach(() => {
    resource.kill();
  })
})
